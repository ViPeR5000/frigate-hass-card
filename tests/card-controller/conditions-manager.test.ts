import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  ConditionsEvaluateRequestEvent,
  ConditionsManager,
  evaluateConditionViaEvent,
  getOverriddenConfig,
} from '../../src/card-controller/conditions-manager';
import { MicrophoneState } from '../../src/card-controller/types';
import { FrigateCardCondition } from '../../src/config/types';
import {
  createCardAPI,
  createCondition,
  createConfig,
  createMediaLoadedInfo,
  createStateEntity,
  createUser,
} from '../test-utils';

// @vitest-environment jsdom
describe('ConditionEvaluateRequestEvent', () => {
  it('should construct', () => {
    const conditions = [createCondition({ condition: 'fullscreen', fullscreen: true })];
    const event = new ConditionsEvaluateRequestEvent(conditions, {
      bubbles: true,
      composed: true,
    });

    expect(event.type).toBe('frigate-card:conditions:evaluate');
    expect(event.conditions).toBe(conditions);
    expect(event.bubbles).toBeTruthy();
    expect(event.composed).toBeTruthy();
  });
});

describe('evaluateConditionViaEvent', () => {
  it('should evaluate true without condition', () => {
    const element = document.createElement('div');
    expect(evaluateConditionViaEvent(element)).toBeTruthy();
  });
  it('should dispatch event with condition and evaluate true', () => {
    const element = document.createElement('div');
    const conditions = [createCondition({ condition: 'fullscreen', fullscreen: true })];
    const handler = vi.fn().mockImplementation((ev: ConditionsEvaluateRequestEvent) => {
      expect(ev.conditions).toBe(conditions);
      ev.evaluation = true;
    });
    element.addEventListener('frigate-card:conditions:evaluate', handler);

    expect(evaluateConditionViaEvent(element, conditions)).toBeTruthy();
    expect(handler).toBeCalled();
  });
  it('should dispatch event with condition and evaluate false', () => {
    const element = document.createElement('div');
    const conditions = [createCondition({ condition: 'fullscreen', fullscreen: true })];
    const handler = vi.fn().mockImplementation((ev: ConditionsEvaluateRequestEvent) => {
      expect(ev.conditions).toBe(conditions);
      ev.evaluation = false;
    });
    element.addEventListener('frigate-card:conditions:evaluate', handler);

    expect(evaluateConditionViaEvent(element, conditions)).toBeFalsy();
    expect(handler).toBeCalled();
  });
  it('should dispatch event evaluate false if no evaluation', () => {
    const element = document.createElement('div');
    const conditions = [createCondition({ condition: 'fullscreen', fullscreen: true })];
    const handler = vi.fn();
    element.addEventListener('frigate-card:conditions:evaluate', handler);

    expect(evaluateConditionViaEvent(element, conditions)).toBeFalsy();
    expect(handler).toBeCalled();
  });
});

describe('getOverriddenConfig', () => {
  const config = {
    menu: {
      style: 'none',
    },
  };

  it('should not override without overrides', () => {
    const manager = new ConditionsManager(createCardAPI());
    manager.setState({ fullscreen: true });

    expect(getOverriddenConfig(manager, config)).toBe(config);
  });

  it('should not override when condition does not match', () => {
    const manager = new ConditionsManager(createCardAPI());
    expect(
      getOverriddenConfig(manager, config, {
        configOverrides: [
          {
            merge: {
              menu: {
                style: 'hidden',
              },
            },
            delete: ['menu.style'],
            set: {
              'menu.style': 'overlay',
            },
            conditions: [
              {
                condition: 'fullscreen' as const,
                fullscreen: true,
              },
            ],
          },
        ],
      }),
    ).toBe(config);
  });

  describe('should merge', () => {
    it('with path', () => {
      const manager = new ConditionsManager(createCardAPI());
      manager.setState({ fullscreen: true });

      expect(
        getOverriddenConfig(manager, config, {
          configOverrides: [
            {
              merge: {
                'live.controls.thumbnails': {
                  mode: 'none',
                },
              },
              conditions: [
                {
                  condition: 'fullscreen' as const,
                  fullscreen: true,
                },
              ],
            },
          ],
        }),
      ).toEqual({
        menu: {
          style: 'none',
        },
        live: {
          controls: {
            thumbnails: {
              mode: 'none',
            },
          },
        },
      });
    });

    it('without path', () => {
      const manager = new ConditionsManager(createCardAPI());
      manager.setState({ fullscreen: true });

      expect(
        getOverriddenConfig(manager, config, {
          configOverrides: [
            {
              merge: {
                menu: {
                  style: 'hidden',
                },
              },
              conditions: [
                {
                  condition: 'fullscreen' as const,
                  fullscreen: true,
                },
              ],
            },
          ],
        }),
      ).toEqual({
        menu: {
          style: 'hidden',
        },
      });
    });

    it('with invalid merge', () => {
      const manager = new ConditionsManager(createCardAPI());
      manager.setState({ fullscreen: true });

      expect(
        getOverriddenConfig(manager, config, {
          configOverrides: [
            {
              merge: 6 as unknown as Record<string, unknown>,
              conditions: [
                {
                  condition: 'fullscreen' as const,
                  fullscreen: true,
                },
              ],
            },
          ],
        }),
      ).toEqual({
        menu: {
          style: 'none',
        },
      });
    });
  });

  describe('should set', () => {
    it('leaf node', () => {
      const manager = new ConditionsManager(createCardAPI());
      manager.setState({ fullscreen: true });

      expect(
        getOverriddenConfig(manager, config, {
          configOverrides: [
            {
              set: {
                'menu.style': 'hidden',
              },
              conditions: [
                {
                  condition: 'fullscreen' as const,
                  fullscreen: true,
                },
              ],
            },
          ],
        }),
      ).toEqual({
        menu: {
          style: 'hidden',
        },
      });
    });

    it('root node', () => {
      const manager = new ConditionsManager(createCardAPI());
      manager.setState({ fullscreen: true });

      expect(
        getOverriddenConfig(manager, config, {
          configOverrides: [
            {
              set: {
                menu: {
                  style: 'hidden',
                },
              },
              conditions: [
                {
                  condition: 'fullscreen' as const,
                  fullscreen: true,
                },
              ],
            },
          ],
        }),
      ).toEqual({
        menu: {
          style: 'hidden',
        },
      });
    });
  });

  describe('should delete', () => {
    it('leaf node', () => {
      const manager = new ConditionsManager(createCardAPI());
      manager.setState({ fullscreen: true });

      expect(
        getOverriddenConfig(manager, config, {
          configOverrides: [
            {
              delete: ['menu.style' as const],
              conditions: [
                {
                  condition: 'fullscreen' as const,
                  fullscreen: true,
                },
              ],
            },
          ],
        }),
      ).toEqual({
        menu: {},
      });
    });

    it('root node', () => {
      const manager = new ConditionsManager(createCardAPI());
      manager.setState({ fullscreen: true });

      expect(
        getOverriddenConfig(manager, config, {
          configOverrides: [
            {
              delete: ['menu' as const],
              conditions: [
                {
                  condition: 'fullscreen' as const,
                  fullscreen: true,
                },
              ],
            },
          ],
        }),
      ).toEqual({});
    });
  });

  describe('should validate schema', () => {
    const testSchema = z.object({
      menu: z.object({
        style: z.enum(['none', 'hidden']),
      }),
    });

    it('passing', () => {
      const manager = new ConditionsManager(createCardAPI());
      manager.setState({ fullscreen: true });

      expect(
        getOverriddenConfig(manager, config, {
          configOverrides: [
            {
              conditions: [
                {
                  condition: 'fullscreen' as const,
                  fullscreen: true,
                },
              ],
              set: {
                'menu.style': 'hidden',
              },
            },
          ],
          schema: testSchema,
        }),
      ).toEqual({
        menu: {
          style: 'hidden',
        },
      });
    });

    it('failing', () => {
      const manager = new ConditionsManager(createCardAPI());
      manager.setState({ fullscreen: true });

      expect(() =>
        getOverriddenConfig(manager, config, {
          configOverrides: [
            {
              conditions: [
                {
                  condition: 'fullscreen' as const,
                  fullscreen: true,
                },
              ],
              set: {
                'menu.style': 'NOT_A_STYLE',
              },
            },
          ],
          schema: testSchema,
        }),
      ).toThrowError(/Invalid override configuration/);
    });
  });
});

describe('ConditionsManager', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should get epoch', () => {
    const manager = new ConditionsManager(createCardAPI());
    const epoch_1 = manager.getEpoch();
    expect(epoch_1).toEqual({ manager: manager });

    manager.setState({ fullscreen: true });

    const epoch_2 = manager.getEpoch();
    expect(epoch_2).toEqual({ manager: manager });

    // Since the state was set the wrappers should be different.
    expect(epoch_1).not.toBe(epoch_2);
  });

  it('should get state', () => {
    const state = { fullscreen: true };

    const manager = new ConditionsManager(createCardAPI());
    manager.setState(state);
    expect(manager.getState()).toEqual(state);
  });

  describe('should set state', () => {
    it('should set and be able to get it again', () => {
      const state = {
        fullscreen: true,
      };

      const manager = new ConditionsManager(createCardAPI());

      manager.setState(state);
      expect(manager.getState()).toEqual(state);
    });

    it('should set but only trigger when necessary', () => {
      const state_1 = {
        fullscreen: true,
        state: {
          'binary_sensor.foo': createStateEntity(),
        },
      };

      const listener = vi.fn();
      const manager = new ConditionsManager(createCardAPI(), listener);

      manager.setState(state_1);
      expect(listener).toBeCalledTimes(1);

      manager.setState(state_1);
      expect(listener).toBeCalledTimes(1);

      manager.setState({ fullscreen: true });
      expect(listener).toBeCalledTimes(1);

      manager.setState({
        state: {
          'binary_sensor.foo': createStateEntity(),
        },
      });
      expect(listener).toBeCalledTimes(1);

      manager.setState({ fullscreen: false });
      expect(listener).toBeCalledTimes(2);

      manager.setState({ fullscreen: false });
      expect(listener).toBeCalledTimes(2);

      manager.setState({
        state: {
          'binary_sensor.foo': createStateEntity({ state: 'off' }),
        },
      });
      expect(listener).toBeCalledTimes(3);
    });
  });

  describe('should handle hasHAStateConditions', () => {
    beforeEach(() => {
      vi.spyOn(window, 'matchMedia').mockReturnValueOnce({
        matches: false,
        addEventListener: vi.fn(),
      } as unknown as MediaQueryList);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    const createSuitableConfig = (conditions: FrigateCardCondition[]) => {
      return createConfig({
        overrides: [
          {
            merge: {},
            conditions: conditions,
          },
        ],
      });
    };

    it('without HA state conditions', () => {
      const manager = new ConditionsManager(createCardAPI());
      expect(manager.hasHAStateConditions()).toBeFalsy();
    });

    describe('with HA state conditions', () => {
      it('explicitly stated', () => {
        const api = createCardAPI();
        const numericConfig = createSuitableConfig([
          {
            condition: 'state' as const,
            entity: 'binary_sensor.foo',
            state: 'on',
          },
        ]);
        vi.mocked(api.getConfigManager().getConfig).mockReturnValue(numericConfig);
        const manager = new ConditionsManager(api);
        manager.setConditionsFromConfig();

        expect(manager.hasHAStateConditions()).toBeTruthy();
      });

      it('implicitly assumed', () => {
        const api = createCardAPI();
        const numericConfig = createSuitableConfig([
          {
            entity: 'binary_sensor.foo',
            state: 'on',
          },
        ]);
        vi.mocked(api.getConfigManager().getConfig).mockReturnValue(numericConfig);
        const manager = new ConditionsManager(api);
        manager.setConditionsFromConfig();

        expect(manager.hasHAStateConditions()).toBeTruthy();
      });
    });

    it('with HA numeric_state conditions', () => {
      const api = createCardAPI();
      const numericStateConfig = createSuitableConfig([
        {
          condition: 'numeric_state' as const,
          entity: 'sensor.foo',
          above: 10,
        },
      ]);
      vi.mocked(api.getConfigManager().getConfig).mockReturnValue(numericStateConfig);
      const manager = new ConditionsManager(api);
      manager.setConditionsFromConfig();

      expect(manager.hasHAStateConditions()).toBeTruthy();
    });

    it('with HA user conditions', () => {
      const api = createCardAPI();
      const userConfig = createSuitableConfig([
        {
          condition: 'user' as const,
          users: ['user_1'],
        },
      ]);
      vi.mocked(api.getConfigManager().getConfig).mockReturnValue(userConfig);
      const manager = new ConditionsManager(api);
      manager.setConditionsFromConfig();

      expect(manager.hasHAStateConditions()).toBeTruthy();
    });

    it('with automations', () => {
      const api = createCardAPI();
      const userConfig = createConfig({
        automations: [
          {
            conditions: [
              {
                condition: 'state' as const,
                entity: 'binary_sensor.foo',
                state: 'on',
              },
            ],
            actions: [
              {
                action: 'fire-dom-event',
              },
            ],
          },
        ],
      });

      vi.mocked(api.getConfigManager().getConfig).mockReturnValue(userConfig);
      const manager = new ConditionsManager(api);
      manager.setConditionsFromConfig();

      expect(manager.hasHAStateConditions()).toBeTruthy();
    });
  });

  describe('should evaluate conditions', () => {
    it('with a view condition', () => {
      const manager = new ConditionsManager(createCardAPI());
      const conditions = [{ condition: 'view' as const, views: ['foo'] }];
      expect(manager.evaluateConditions(conditions)).toBeFalsy();
      manager.setState({ view: 'foo' });
      expect(manager.evaluateConditions(conditions)).toBeTruthy();
    });

    it('with fullscreen condition', () => {
      const manager = new ConditionsManager(createCardAPI());
      const conditions = [{ condition: 'fullscreen' as const, fullscreen: true }];
      expect(manager.evaluateConditions(conditions)).toBeFalsy();
      manager.setState({ fullscreen: true });
      expect(manager.evaluateConditions(conditions)).toBeTruthy();
      manager.setState({ fullscreen: false });
      expect(manager.evaluateConditions(conditions)).toBeFalsy();
    });

    it('with expand condition', () => {
      const manager = new ConditionsManager(createCardAPI());
      const conditions = [{ condition: 'expand' as const, expand: true }];
      expect(manager.evaluateConditions(conditions)).toBeFalsy();
      manager.setState({ expand: true });
      expect(manager.evaluateConditions(conditions)).toBeTruthy();
      manager.setState({ expand: false });
      expect(manager.evaluateConditions(conditions)).toBeFalsy();
    });

    it('with camera condition', () => {
      const manager = new ConditionsManager(createCardAPI());
      const conditions = [{ condition: 'camera' as const, cameras: ['bar'] }];
      expect(manager.evaluateConditions(conditions)).toBeFalsy();
      manager.setState({ camera: 'bar' });
      expect(manager.evaluateConditions(conditions)).toBeTruthy();
      manager.setState({ camera: 'will-not-match' });
      expect(manager.evaluateConditions(conditions)).toBeFalsy();
    });

    describe('with stock HA conditions', () => {
      describe('with state condition', () => {
        describe('positive', () => {
          it('single', () => {
            const manager = new ConditionsManager(createCardAPI());
            const conditions = [
              {
                condition: 'state' as const,
                entity: 'binary_sensor.foo',
                state: 'on',
              },
            ];
            expect(manager.evaluateConditions(conditions)).toBeFalsy();
            manager.setState({ state: { 'binary_sensor.foo': createStateEntity() } });
            expect(manager.evaluateConditions(conditions)).toBeTruthy();
            manager.setState({
              state: { 'binary_sensor.foo': createStateEntity({ state: 'off' }) },
            });
            expect(manager.evaluateConditions(conditions)).toBeFalsy();
          });

          it('multiple', () => {
            const manager = new ConditionsManager(createCardAPI());
            const conditions = [
              {
                condition: 'state' as const,
                entity: 'binary_sensor.foo',
                state: ['active', 'on'],
              },
            ];
            expect(manager.evaluateConditions(conditions)).toBeFalsy();
            manager.setState({ state: { 'binary_sensor.foo': createStateEntity() } });
            expect(manager.evaluateConditions(conditions)).toBeTruthy();
            manager.setState({
              state: { 'binary_sensor.foo': createStateEntity({ state: 'active' }) },
            });
            expect(manager.evaluateConditions(conditions)).toBeTruthy();
            manager.setState({
              state: { 'binary_sensor.foo': createStateEntity({ state: 'off' }) },
            });
            expect(manager.evaluateConditions(conditions)).toBeFalsy();
          });
        });

        describe('negative', () => {
          it('single', () => {
            const manager = new ConditionsManager(createCardAPI());
            const conditions = [
              {
                condition: 'state' as const,
                entity: 'binary_sensor.foo',
                state_not: 'on',
              },
            ];
            expect(manager.evaluateConditions(conditions)).toBeFalsy();
            manager.setState({ state: { 'binary_sensor.foo': createStateEntity() } });
            expect(manager.evaluateConditions(conditions)).toBeFalsy();
            manager.setState({
              state: { 'binary_sensor.foo': createStateEntity({ state: 'off' }) },
            });
            expect(manager.evaluateConditions(conditions)).toBeTruthy();
          });
        });

        it('multiple', () => {
          const manager = new ConditionsManager(createCardAPI());
          const conditions = [
            {
              condition: 'state' as const,
              entity: 'binary_sensor.foo',
              state_not: ['active', 'on'],
            },
          ];
          expect(manager.evaluateConditions(conditions)).toBeFalsy();
          manager.setState({ state: { 'binary_sensor.foo': createStateEntity() } });
          expect(manager.evaluateConditions(conditions)).toBeFalsy();
          manager.setState({
            state: { 'binary_sensor.foo': createStateEntity({ state: 'active' }) },
          });
          expect(manager.evaluateConditions(conditions)).toBeFalsy();
          manager.setState({
            state: { 'binary_sensor.foo': createStateEntity({ state: 'off' }) },
          });
          expect(manager.evaluateConditions(conditions)).toBeTruthy();
        });

        it('implicit state condition', () => {
          const manager = new ConditionsManager(createCardAPI());
          const conditions = [
            {
              entity: 'binary_sensor.foo',
              state: 'on',
            },
          ];
          expect(manager.evaluateConditions(conditions)).toBeFalsy();
          manager.setState({ state: { 'binary_sensor.foo': createStateEntity() } });
          expect(manager.evaluateConditions(conditions)).toBeTruthy();
          manager.setState({
            state: { 'binary_sensor.foo': createStateEntity({ state: 'off' }) },
          });
          expect(manager.evaluateConditions(conditions)).toBeFalsy();
        });
      });

      describe('with numeric state condition', () => {
        it('above', () => {
          const manager = new ConditionsManager(createCardAPI());
          const conditions = [
            {
              condition: 'numeric_state' as const,
              entity: 'sensor.foo',
              above: 10,
            },
          ];
          expect(manager.evaluateConditions(conditions)).toBeFalsy();
          manager.setState({
            state: { 'sensor.foo': createStateEntity({ state: '11' }) },
          });
          expect(manager.evaluateConditions(conditions)).toBeTruthy();
          manager.setState({
            state: { 'binary_sensor.foo': createStateEntity({ state: '9' }) },
          });
          expect(manager.evaluateConditions(conditions)).toBeFalsy();
        });

        it('below', () => {
          const manager = new ConditionsManager(createCardAPI());
          const conditions = [
            {
              condition: 'numeric_state' as const,
              entity: 'sensor.foo',
              below: 10,
            },
          ];
          expect(manager.evaluateConditions(conditions)).toBeFalsy();
          manager.setState({
            state: { 'sensor.foo': createStateEntity({ state: '11' }) },
          });
          expect(manager.evaluateConditions(conditions)).toBeFalsy();
          manager.setState({
            state: { 'sensor.foo': createStateEntity({ state: '9' }) },
          });
          expect(manager.evaluateConditions(conditions)).toBeTruthy();
        });
      });
    });

    it('with user condition', () => {
      const manager = new ConditionsManager(createCardAPI());
      const conditions = [
        {
          condition: 'user' as const,
          users: ['user_1', 'user_2'],
        },
      ];
      expect(manager.evaluateConditions(conditions)).toBeFalsy();
      manager.setState({
        user: createUser({ id: 'user_1' }),
      });
      expect(manager.evaluateConditions(conditions)).toBeTruthy();
      manager.setState({
        user: createUser({ id: 'user_WRONG' }),
      });
      expect(manager.evaluateConditions(conditions)).toBeFalsy();
    });

    it('with media loaded condition', () => {
      const manager = new ConditionsManager(createCardAPI());
      const conditions = [{ condition: 'media_loaded' as const, media_loaded: true }];
      expect(manager.evaluateConditions(conditions)).toBeFalsy();
      manager.setState({ mediaLoadedInfo: createMediaLoadedInfo() });
      expect(manager.evaluateConditions(conditions)).toBeTruthy();
      manager.setState({ mediaLoadedInfo: null });
      expect(manager.evaluateConditions(conditions)).toBeFalsy();
    });

    describe('with screen condition', () => {
      const mediaQueryConfig = {
        type: 'custom:frigate-card',
        cameras: [{}],
        elements: [
          {
            type: 'custom:frigate-card-conditional',
            conditions: [
              {
                condition: 'fullscreen' as const,
                fullscreen: true,
              },
            ],
            elements: [
              {
                type: 'custom:nested-unknown-object',
                unknown_key: {
                  type: 'custom:frigate-card-conditional',
                  conditions: [
                    {
                      condition: 'screen' as const,
                      media_query: 'media query goes here',
                    },
                  ],
                  elements: [],
                },
              },
            ],
          },
        ],
      };

      it('on evaluation', () => {
        vi.spyOn(window, 'matchMedia')
          .mockReturnValueOnce(<MediaQueryList>{ matches: true })
          .mockReturnValueOnce(<MediaQueryList>{ matches: false });

        const manager = new ConditionsManager(createCardAPI());
        const conditions = [{ condition: 'screen' as const, media_query: 'whatever' }];
        expect(manager.evaluateConditions(conditions)).toBeTruthy();
        expect(manager.evaluateConditions(conditions)).toBeFalsy();
      });

      it('on trigger', () => {
        const addEventListener = vi.fn();
        const removeEventListener = vi.fn();
        vi.spyOn(window, 'matchMedia').mockReturnValueOnce({
          matches: true,
          addEventListener: addEventListener,
          removeEventListener: removeEventListener,
        } as unknown as MediaQueryList);
        const api = createCardAPI();
        vi.mocked(api.getConfigManager().getConfig).mockReturnValue(
          createConfig(mediaQueryConfig),
        );
        const callback = vi.fn();
        const manager = new ConditionsManager(api, callback);

        manager.setConditionsFromConfig();

        expect(addEventListener).toHaveBeenCalledWith('change', expect.anything());

        // Call the media query callback and use it to pretend a match happened. The
        // callback is the 0th mock innvocation and the 1st argument.
        addEventListener.mock.calls[0][1]();

        // This should result in a callback to our state listener.
        expect(callback).toBeCalled();

        // Remove the conditions, which should remove the media query listener.
        manager.removeConditions();
        expect(removeEventListener).toBeCalled();
      });
    });

    it('with display mode condition', () => {
      const manager = new ConditionsManager(createCardAPI());
      const conditions = [
        { condition: 'display_mode' as const, display_mode: 'grid' as const },
      ];
      expect(manager.evaluateConditions(conditions)).toBeFalsy();
      manager.setState({ displayMode: 'grid' });
      expect(manager.evaluateConditions(conditions)).toBeTruthy();
      manager.setState({ displayMode: 'single' });
      expect(manager.evaluateConditions(conditions)).toBeFalsy();
    });

    it('with triggered condition', () => {
      const manager = new ConditionsManager(createCardAPI());
      const conditions = [
        { condition: 'triggered' as const, triggered: ['camera_1', 'camera_2'] },
      ];
      expect(manager.evaluateConditions(conditions)).toBeFalsy();
      manager.setState({ triggered: new Set(['camera_1']) });
      expect(manager.evaluateConditions(conditions)).toBeTruthy();
      manager.setState({ triggered: new Set(['camera_2', 'camera_1', 'camera_3']) });
      expect(manager.evaluateConditions(conditions)).toBeTruthy();
      manager.setState({ triggered: new Set(['camera_3']) });
      expect(manager.evaluateConditions(conditions)).toBeFalsy();
    });

    it('with interaction condition', () => {
      const manager = new ConditionsManager(createCardAPI());
      const conditions = [{ condition: 'interaction' as const, interaction: true }];
      expect(manager.evaluateConditions(conditions)).toBeFalsy();
      manager.setState({ interaction: true });
      expect(manager.evaluateConditions(conditions)).toBeTruthy();
      manager.setState({ interaction: false });
      expect(manager.evaluateConditions(conditions)).toBeFalsy();
    });

    describe('with microphone condition', () => {
      const createMicrophoneState = (
        state: Partial<MicrophoneState>,
      ): MicrophoneState => {
        return {
          connected: false,
          muted: false,
          forbidden: false,
          ...state,
        };
      };
      it('empty', () => {
        const manager = new ConditionsManager(createCardAPI());
        const conditions = [{ condition: 'microphone' as const }];
        expect(manager.evaluateConditions(conditions)).toBeTruthy();
        manager.setState({ microphone: createMicrophoneState({ connected: true }) });
        expect(manager.evaluateConditions(conditions)).toBeTruthy();
        manager.setState({ microphone: createMicrophoneState({ connected: false }) });
        expect(manager.evaluateConditions(conditions)).toBeTruthy();
        manager.setState({ microphone: createMicrophoneState({ muted: true }) });
        expect(manager.evaluateConditions(conditions)).toBeTruthy();
        manager.setState({ microphone: createMicrophoneState({ muted: false }) });
        expect(manager.evaluateConditions(conditions)).toBeTruthy();
      });

      it('connected is true', () => {
        const manager = new ConditionsManager(createCardAPI());
        const conditions = [{ condition: 'microphone' as const, connected: true }];
        expect(manager.evaluateConditions(conditions)).toBeFalsy();
        manager.setState({ microphone: createMicrophoneState({ connected: true }) });
        expect(manager.evaluateConditions(conditions)).toBeTruthy();
        manager.setState({ microphone: createMicrophoneState({ connected: false }) });
        expect(manager.evaluateConditions(conditions)).toBeFalsy();
      });

      it('connected is false', () => {
        const manager = new ConditionsManager(createCardAPI());
        const conditions = [{ condition: 'microphone' as const, connected: false }];
        expect(manager.evaluateConditions(conditions)).toBeFalsy();
        manager.setState({ microphone: createMicrophoneState({ connected: true }) });
        expect(manager.evaluateConditions(conditions)).toBeFalsy();
        manager.setState({ microphone: createMicrophoneState({ connected: false }) });
        expect(manager.evaluateConditions(conditions)).toBeTruthy();
      });

      it('muted is true', () => {
        const manager = new ConditionsManager(createCardAPI());
        const conditions = [{ condition: 'microphone' as const, muted: true }];
        expect(manager.evaluateConditions(conditions)).toBeFalsy();
        manager.setState({ microphone: createMicrophoneState({ muted: true }) });
        expect(manager.evaluateConditions(conditions)).toBeTruthy();
        manager.setState({ microphone: createMicrophoneState({ muted: false }) });
        expect(manager.evaluateConditions(conditions)).toBeFalsy();
      });

      it('muted is false', () => {
        const manager = new ConditionsManager(createCardAPI());
        const conditions = [{ condition: 'microphone' as const, muted: false }];
        expect(manager.evaluateConditions(conditions)).toBeFalsy();
        manager.setState({ microphone: createMicrophoneState({ muted: true }) });
        expect(manager.evaluateConditions(conditions)).toBeFalsy();
        manager.setState({ microphone: createMicrophoneState({ muted: false }) });
        expect(manager.evaluateConditions(conditions)).toBeTruthy();
      });

      it('connected and muted', () => {
        const manager = new ConditionsManager(createCardAPI());
        const conditions = [
          { condition: 'microphone' as const, muted: false, connected: true },
        ];
        expect(manager.evaluateConditions(conditions)).toBeFalsy();
        manager.setState({ microphone: createMicrophoneState({ muted: true }) });
        expect(manager.evaluateConditions(conditions)).toBeFalsy();
        manager.setState({ microphone: createMicrophoneState({ muted: false }) });
        expect(manager.evaluateConditions(conditions)).toBeFalsy();
        manager.setState({
          microphone: createMicrophoneState({ connected: false, muted: false }),
        });
        expect(manager.evaluateConditions(conditions)).toBeFalsy();
        manager.setState({
          microphone: createMicrophoneState({ connected: true, muted: false }),
        });
        expect(manager.evaluateConditions(conditions)).toBeTruthy();
      });
    });

    describe('with key condition', () => {
      it('simple keypress', () => {
        const manager = new ConditionsManager(createCardAPI());
        const conditions = [{ condition: 'key' as const, key: 'a' }];
        expect(manager.evaluateConditions(conditions)).toBeFalsy();
        manager.setState({
          keys: {
            a: { state: 'down', ctrl: false, shift: false, alt: false, meta: false },
          },
        });
        expect(manager.evaluateConditions(conditions)).toBeTruthy();
        manager.setState({
          keys: {
            a: { state: 'up', ctrl: false, shift: false, alt: false, meta: false },
          },
        });

        expect(manager.evaluateConditions(conditions)).toBeFalsy();
      });

      it('keypress with modifiers', () => {
        const manager = new ConditionsManager(createCardAPI());
        const conditions = [
          {
            condition: 'key' as const,
            key: 'a',
            state: 'down' as const,
            ctrl: true,
            shift: true,
            alt: true,
            meta: true,
          },
        ];
        expect(manager.evaluateConditions(conditions)).toBeFalsy();
        manager.setState({
          keys: {
            a: { state: 'down', ctrl: false, shift: false, alt: false, meta: false },
          },
        });
        expect(manager.evaluateConditions(conditions)).toBeFalsy();
        manager.setState({
          keys: {
            a: { state: 'down', ctrl: true, shift: true, alt: true, meta: false },
          },
        });
        expect(manager.evaluateConditions(conditions)).toBeFalsy();
        manager.setState({
          keys: {
            a: { state: 'down', ctrl: true, shift: true, alt: true, meta: true },
          },
        });
        expect(manager.evaluateConditions(conditions)).toBeTruthy();
      });
    });

    describe('with user agent condition', () => {
      const userAgent =
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

      it('should match exact user agent', () => {
        const manager = new ConditionsManager(createCardAPI());
        const conditions = [{ condition: 'user_agent' as const, user_agent: userAgent }];
        expect(manager.evaluateConditions(conditions)).toBeFalsy();
        manager.setState({
          userAgent: userAgent,
        });
        expect(manager.evaluateConditions(conditions)).toBeTruthy();
        manager.setState({
          userAgent: 'Something else',
        });
        expect(manager.evaluateConditions(conditions)).toBeFalsy();
      });

      it('should match user agent regex', () => {
        const manager = new ConditionsManager(createCardAPI());
        const conditions = [
          { condition: 'user_agent' as const, user_agent_re: 'Chrome/' },
        ];
        expect(manager.evaluateConditions(conditions)).toBeFalsy();
        manager.setState({
          userAgent: userAgent,
        });
        expect(manager.evaluateConditions(conditions)).toBeTruthy();
        manager.setState({
          userAgent: 'Something else',
        });
        expect(manager.evaluateConditions(conditions)).toBeFalsy();
      });

      it('should match companion app', () => {
        const manager = new ConditionsManager(createCardAPI());
        const conditions = [{ condition: 'user_agent' as const, companion: true }];
        expect(manager.evaluateConditions(conditions)).toBeFalsy();
        manager.setState({
          userAgent: 'Home Assistant/',
        });
        expect(manager.evaluateConditions(conditions)).toBeTruthy();
        manager.setState({
          userAgent: userAgent,
        });
        expect(manager.evaluateConditions(conditions)).toBeFalsy();
      });

      it('should match multiple parameters', () => {
        const manager = new ConditionsManager(createCardAPI());
        const conditions = [
          {
            condition: 'user_agent' as const,
            companion: true,
            user_agent: 'Home Assistant/',
            user_agent_re: 'Home.Assistant',
          },
        ];
        expect(manager.evaluateConditions(conditions)).toBeFalsy();
        manager.setState({
          userAgent: 'Home Assistant/',
        });
        expect(manager.evaluateConditions(conditions)).toBeTruthy();
        manager.setState({
          userAgent: 'Something else',
        });
        expect(manager.evaluateConditions(conditions)).toBeFalsy();
      });
    });
  });

  it('should add listener', () => {
    const listener = vi.fn();
    const manager = new ConditionsManager(createCardAPI());
    manager.addListener(listener);

    const state = { fullscreen: true };
    manager.setState(state);

    expect(listener).toBeCalledWith(state, {});
  });

  it('should remove listener', () => {
    const listener = vi.fn();
    const manager = new ConditionsManager(createCardAPI());
    manager.addListener(listener);
    manager.removeListener(listener);

    const state = { fullscreen: true };
    manager.setState(state);

    expect(listener).not.toBeCalled();
  });
});
