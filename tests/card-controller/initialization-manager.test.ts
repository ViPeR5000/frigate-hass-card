import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import {
  InitializationAspect,
  InitializationManager,
} from '../../src/card-controller/initialization-manager';
import { loadLanguages } from '../../src/localize/localize';
import { sideLoadHomeAssistantElements } from '../../src/utils/ha';
import { Initializer } from '../../src/utils/initializer/initializer';
import { createCardAPI, createConfig, createHASS } from '../test-utils';

vi.mock('../../src/localize/localize.js');
vi.mock('../../src/utils/ha/index.js');

// @vitest-environment jsdom
describe('InitializationManager', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
  });

  describe('should correctly determine when mandatory initialization is required', () => {
    it('without config', () => {
      const api = createCardAPI();
      const initializer = mock<Initializer>();
      const manager = new InitializationManager(api, initializer);

      expect(manager.isInitializedMandatory()).toBeFalsy();
    });

    it('without aspects', () => {
      const api = createCardAPI();
      const initializer = mock<Initializer>();
      const manager = new InitializationManager(api, initializer);

      vi.mocked(api.getConfigManager().getConfig).mockReturnValue(createConfig());
      initializer.isInitializedMultiple.mockReturnValue(false);

      expect(manager.isInitializedMandatory()).toBeFalsy();
    });

    it('without view', () => {
      const api = createCardAPI();
      const initializer = mock<Initializer>();
      const manager = new InitializationManager(api, initializer);

      vi.mocked(api.getConfigManager().getConfig).mockReturnValue(createConfig());
      initializer.isInitializedMultiple.mockReturnValue(true);

      expect(manager.isInitializedMandatory()).toBeFalsy();
    });

    it('with aspects and view', () => {
      const api = createCardAPI();
      const initializer = mock<Initializer>();
      const manager = new InitializationManager(api, initializer);

      vi.mocked(api.getConfigManager().getConfig).mockReturnValue(createConfig());
      initializer.isInitializedMultiple.mockReturnValue(true);
      vi.mocked(api.getViewManager().hasView).mockReturnValue(true);

      expect(manager.isInitializedMandatory()).toBeTruthy();
    });

    it('with microphone if configured', () => {
      const api = createCardAPI();
      const initializer = mock<Initializer>();
      const manager = new InitializationManager(api, initializer);

      vi.mocked(api.getConfigManager().getConfig).mockReturnValue(
        createConfig({
          live: {
            microphone: {
              always_connected: true,
            },
          },
        }),
      );
      initializer.isInitializedMultiple.mockReturnValue(true);
      vi.mocked(api.getViewManager().hasView).mockReturnValue(true);

      expect(manager.isInitializedMandatory()).toBeTruthy();
    });
  });

  describe('should initialize mandatory', () => {
    it('without hass', async () => {
      const manager = new InitializationManager(createCardAPI());
      expect(await manager.initializeMandatory()).toBeFalsy();
    });

    it('without config', async () => {
      const api = createCardAPI();
      const manager = new InitializationManager(api);
      vi.mocked(api.getHASSManager().getHASS).mockReturnValue(createHASS());
      expect(await manager.initializeMandatory()).toBeFalsy();
    });

    it('successfully', async () => {
      const api = createCardAPI();
      vi.mocked(api.getHASSManager().getHASS).mockReturnValue(createHASS());
      vi.mocked(api.getConfigManager().getConfig).mockReturnValue(createConfig());
      vi.mocked(api.getMessageManager().hasMessage).mockReturnValue(false);
      vi.mocked(api.getQueryStringManager().hasViewRelatedActions).mockReturnValue(
        false,
      );
      const manager = new InitializationManager(api);

      expect(await manager.initializeMandatory()).toBeTruthy();

      expect(loadLanguages).toBeCalled();
      expect(sideLoadHomeAssistantElements).toBeCalled();
      expect(api.getCameraManager().initializeCamerasFromConfig).toBeCalled();
      expect(api.getViewManager().setViewDefaultWithNewQuery).toBeCalled();
      expect(api.getMicrophoneManager().connect).not.toBeCalled();
    });

    it('successfully with microphone if configured', async () => {
      const api = createCardAPI();
      vi.mocked(api.getHASSManager().getHASS).mockReturnValue(createHASS());
      vi.mocked(api.getConfigManager().getConfig).mockReturnValue(
        createConfig({
          live: {
            microphone: {
              always_connected: true,
            },
          },
        }),
      );
      const manager = new InitializationManager(api);

      expect(await manager.initializeMandatory()).toBeTruthy();
      expect(api.getMicrophoneManager().connect).toBeCalled();
    });

    it('successfully with querystring view', async () => {
      const api = createCardAPI();
      vi.mocked(api.getHASSManager().getHASS).mockReturnValue(createHASS());
      vi.mocked(api.getConfigManager().getConfig).mockReturnValue(createConfig());
      vi.mocked(api.getMessageManager().hasMessage).mockReturnValue(false);
      vi.mocked(api.getQueryStringManager().hasViewRelatedActions).mockReturnValue(true);
      const manager = new InitializationManager(api);

      expect(await manager.initializeMandatory()).toBeTruthy();

      expect(api.getQueryStringManager().executeViewRelated).toBeCalled();
    });

    it('with message set during initialization', async () => {
      const api = createCardAPI();
      vi.mocked(api.getHASSManager().getHASS).mockReturnValue(createHASS());
      vi.mocked(api.getConfigManager().getConfig).mockReturnValue(createConfig());
      vi.mocked(api.getMessageManager().hasMessage).mockReturnValue(true);
      vi.mocked(api.getQueryStringManager().hasViewRelatedActions).mockReturnValue(
        false,
      );
      const manager = new InitializationManager(api);

      expect(await manager.initializeMandatory()).toBeTruthy();

      expect(api.getViewManager().setViewByParameters).not.toBeCalled();
      expect(api.getViewManager().setViewDefault).not.toBeCalled();
    });

    it('with languages and side load elements in progress', async () => {
      const api = createCardAPI();
      vi.mocked(api.getHASSManager().getHASS).mockReturnValue(createHASS());
      const initializer = mock<Initializer>();
      const manager = new InitializationManager(api, initializer);
      initializer.initializeMultipleIfNecessary.mockResolvedValue(false);

      expect(await manager.initializeMandatory()).toBeFalsy();
    });

    it('with cameras in progress', async () => {
      const api = createCardAPI();
      vi.mocked(api.getHASSManager().getHASS).mockReturnValue(createHASS());
      vi.mocked(api.getConfigManager().getConfig).mockReturnValue(createConfig());

      const initializer = mock<Initializer>();
      const manager = new InitializationManager(api, initializer);
      initializer.initializeMultipleIfNecessary
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      expect(await manager.initializeMandatory()).toBeFalsy();
    });

    it('with existing view', async () => {
      const api = createCardAPI();
      vi.mocked(api.getHASSManager().getHASS).mockReturnValue(createHASS());
      vi.mocked(api.getConfigManager().getConfig).mockReturnValue(createConfig());
      vi.mocked(api.getViewManager().hasView).mockReturnValue(true);

      const initializer = mock<Initializer>();
      const manager = new InitializationManager(api, initializer);
      initializer.initializeMultipleIfNecessary
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);

      expect(await manager.initializeMandatory()).toBeTruthy();
      expect(api.getCardElementManager().update).toBeCalled();
    });
  });

  describe('should initialize background', () => {
    it('without hass and config', async () => {
      const manager = new InitializationManager(createCardAPI());
      expect(await manager.initializeBackgroundIfNecessary()).toBeFalsy();
    });

    it('successfully when already initialized', async () => {
      const api = createCardAPI();

      const initializer = mock<Initializer>();
      initializer.isInitializedMultiple.mockReturnValue(true);

      const manager = new InitializationManager(api, initializer);
      vi.mocked(api.getHASSManager().getHASS).mockReturnValue(createHASS());
      vi.mocked(api.getConfigManager().getConfig).mockReturnValue(
        createConfig({
          menu: {
            buttons: {
              media_player: {
                enabled: false,
              },
            },
          },
        }),
      );

      expect(await manager.initializeBackgroundIfNecessary()).toBeTruthy();
      expect(api.getMediaPlayerManager().initialize).not.toBeCalled();
      expect(api.getDefaultManager().initialize).not.toBeCalled();
      expect(api.getCardElementManager().update).not.toBeCalled();
    });

    it('successfully with all inititalizers', async () => {
      const api = createCardAPI();
      const manager = new InitializationManager(api);
      vi.mocked(api.getHASSManager().getHASS).mockReturnValue(createHASS());
      vi.mocked(api.getConfigManager().getConfig).mockReturnValue(
        createConfig({
          menu: {
            buttons: {
              media_player: {
                enabled: true,
              },
            },
          },
        }),
      );

      expect(await manager.initializeBackgroundIfNecessary()).toBeTruthy();
      expect(api.getMediaPlayerManager().initialize).toBeCalled();
      expect(api.getDefaultManager().initialize).toBeCalled();
      expect(api.getCardElementManager().update).toBeCalled();
    });

    it('with initializers in progress', async () => {
      const api = createCardAPI();
      vi.mocked(api.getHASSManager().getHASS).mockReturnValue(createHASS());
      vi.mocked(api.getConfigManager().getConfig).mockReturnValue(
        createConfig({
          menu: {
            buttons: {
              media_player: {
                enabled: true,
              },
            },
          },
        }),
      );
      const initializer = mock<Initializer>();

      const manager = new InitializationManager(api, initializer);
      initializer.initializeMultipleIfNecessary.mockResolvedValue(false);

      expect(await manager.initializeBackgroundIfNecessary()).toBeFalsy();
    });
  });

  it('should uninitialize', () => {
    const initializer = mock<Initializer>();
    const manager = new InitializationManager(createCardAPI(), initializer);

    manager.uninitialize(InitializationAspect.CAMERAS);

    expect(initializer.uninitialize).toBeCalledWith(InitializationAspect.CAMERAS);
  });
});
