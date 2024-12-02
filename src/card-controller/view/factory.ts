import {
  FRIGATE_CARD_VIEW_DEFAULT,
  FrigateCardConfig,
  FrigateCardView,
  ViewDisplayMode,
} from '../../config/types';
import { localize } from '../../localize/localize';
import { View, ViewParameters } from '../../view/view';
import { getCameraIDsForViewName } from '../../view/view-to-cameras';
import { CardViewAPI } from '../types';
import { applyViewModifiers } from './modifiers';
import { ViewFactoryOptions, ViewIncompatible, ViewNoCameraError } from './types';

export class ViewFactory {
  protected _api: CardViewAPI;

  constructor(api: CardViewAPI) {
    this._api = api;
  }

  public getViewDefault(options?: ViewFactoryOptions): View | null {
    const config = this._api.getConfigManager().getConfig();
    if (!config) {
      return null;
    }

    // Neither options.baseView.camera nor options.baseView.view are respected
    // here, since this is the default view / camera.
    // See: https://github.com/dermotduffy/frigate-hass-card/issues/1564

    let cameraID: string | null = null;
    const viewName = options?.params?.view ?? config.view.default;

    if (options?.params?.camera) {
      cameraID = options.params.camera;
    } else {
      const cameraIDs = [
        ...getCameraIDsForViewName(this._api.getCameraManager(), viewName),
      ];
      if (!cameraIDs.length) {
        return null;
      }

      if (options?.baseView?.camera && config.view.default_cycle_camera) {
        const currentIndex = cameraIDs.indexOf(options.baseView.camera);
        const targetIndex = currentIndex + 1 >= cameraIDs.length ? 0 : currentIndex + 1;
        cameraID = cameraIDs[targetIndex];
      } else {
        cameraID = cameraIDs[0];
      }
    }

    return this.getViewByParameters({
      params: {
        ...options?.params,
        view: viewName,
        camera: cameraID,
      },
      baseView: options?.baseView,
    });
  }

  public getViewByParameters(options?: ViewFactoryOptions): View | null {
    const config = this._api.getConfigManager().getConfig();
    if (!config) {
      return null;
    }

    let cameraID: string | null =
      options?.params?.camera ?? options?.baseView?.camera ?? null;
    let viewName =
      options?.params?.view ?? options?.baseView?.view ?? config.view.default;

    const allCameraIDs = this._api.getCameraManager().getStore().getCameraIDs();

    if (!cameraID || !allCameraIDs.has(cameraID)) {
      const viewCameraIDs = getCameraIDsForViewName(
        this._api.getCameraManager(),
        viewName,
      );

      // Reset to the default camera.
      cameraID = viewCameraIDs.keys().next().value ?? null;
    }

    if (!cameraID) {
      const camerasToCapabilities = [
        ...this._api.getCameraManager().getStore().getCameras(),
      ].reduce((acc, [cameraID, camera]) => {
        const capabilities = camera.getCapabilities()?.getRawCapabilities();
        if (capabilities) {
          acc[cameraID] = capabilities;
        }
        return acc;
      }, {});

      throw new ViewNoCameraError(localize('error.no_supported_cameras'), {
        view: viewName,
        cameras_capabilities: camerasToCapabilities,
      });
    }

    if (!this.isViewSupportedByCamera(cameraID, viewName)) {
      if (
        options?.failSafe &&
        this.isViewSupportedByCamera(cameraID, FRIGATE_CARD_VIEW_DEFAULT)
      ) {
        viewName = FRIGATE_CARD_VIEW_DEFAULT;
      } else {
        const capabilities = this._api
          .getCameraManager()
          .getStore()
          .getCamera(cameraID)
          ?.getCapabilities()
          ?.getRawCapabilities();

        throw new ViewIncompatible(localize('error.no_supported_camera'), {
          view: viewName,
          camera: cameraID,
          ...(capabilities && { camera_capabilities: capabilities }),
        });
      }
    }

    const displayMode =
      options?.params?.displayMode ??
      options?.baseView?.displayMode ??
      this._getDefaultDisplayModeForView(viewName, config);

    const viewParameters: ViewParameters = {
      ...options?.params,
      view: viewName,
      camera: cameraID,
      displayMode: displayMode,
    };

    const view = options?.baseView
      ? options.baseView.evolve(viewParameters)
      : new View(viewParameters);

    applyViewModifiers(view, options?.modifiers);

    return view;
  }

  public isViewSupportedByCamera(cameraID: string, view: FrigateCardView): boolean {
    return !!getCameraIDsForViewName(this._api.getCameraManager(), view, cameraID).size;
  }

  protected _getDefaultDisplayModeForView(
    viewName: FrigateCardView,
    config: FrigateCardConfig,
  ): ViewDisplayMode {
    let mode: ViewDisplayMode | null = null;
    switch (viewName) {
      case 'media':
      case 'clip':
      case 'recording':
      case 'snapshot':
        mode = config.media_viewer.display?.mode ?? null;
        break;
      case 'live':
        mode = config.live.display?.mode ?? null;
        break;
    }
    return mode ?? 'single';
  }
}
