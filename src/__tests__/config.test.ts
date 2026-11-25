/** Loads src/config.ts afresh with the given EXPO_PUBLIC_* values (and restores the environment after). */
function loadConfig(env: Record<string, string | undefined>): typeof import('../config') {
  const saved: Record<string, string | undefined> = {};
  for (const key of Object.keys(env)) {
    saved[key] = process.env[key];
    if (env[key] === undefined) delete process.env[key];
    else process.env[key] = env[key];
  }
  try {
    let config!: typeof import('../config');
    jest.isolateModules(() => {
      config = require('../config');
    });
    return config;
  } finally {
    for (const key of Object.keys(saved)) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

describe('config', () => {
  it('screenshot mode is off when the variable is unset', () => {
    expect(loadConfig({ EXPO_PUBLIC_SCREENSHOT_MODE: undefined }).SCREENSHOT_MODE).toBe(false);
  });

  it('screenshot mode is off for anything but "1"', () => {
    for (const value of ['', '0', 'true', 'yes']) {
      expect(loadConfig({ EXPO_PUBLIC_SCREENSHOT_MODE: value }).SCREENSHOT_MODE).toBe(false);
    }
  });

  it('screenshot mode is on only for "1"', () => {
    expect(loadConfig({ EXPO_PUBLIC_SCREENSHOT_MODE: '1' }).SCREENSHOT_MODE).toBe(true);
  });

  it('support email and operator name are empty when unset, never an invented fallback', () => {
    const config = loadConfig({ EXPO_PUBLIC_SUPPORT_EMAIL: undefined, EXPO_PUBLIC_OPERATOR_NAME: undefined });
    expect(config.SUPPORT_EMAIL).toBe('');
    expect(config.OPERATOR_NAME).toBe('');
  });

  it('support email and operator name are trimmed', () => {
    const config = loadConfig({ EXPO_PUBLIC_SUPPORT_EMAIL: ' hello@example.com ', EXPO_PUBLIC_OPERATOR_NAME: ' Example Pty Ltd\n' });
    expect(config.SUPPORT_EMAIL).toBe('hello@example.com');
    expect(config.OPERATOR_NAME).toBe('Example Pty Ltd');
  });
});
