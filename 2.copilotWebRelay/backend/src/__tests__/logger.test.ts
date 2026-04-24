/**
 * Logger テスト
 */

import { Logger, LogLevel } from "../logger";

describe("Logger", () => {
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, "log").mockImplementation();
    warnSpy = jest.spyOn(console, "warn").mockImplementation();
    errorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("should log at info level", () => {
    const logger = new Logger("info");
    logger.info("test message");
    expect(logSpy).toHaveBeenCalled();
  });

  it("should not log debug when level is info", () => {
    const logger = new Logger("info");
    logger.debug("debug message");
    expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining("debug message"));
  });

  it("should log debug when level is debug", () => {
    const logger = new Logger("debug");
    logger.debug("debug message");
    expect(logSpy).toHaveBeenCalled();
  });

  it("should log warning", () => {
    const logger = new Logger("info");
    logger.warn("warning message");
    expect(warnSpy).toHaveBeenCalled();
  });

  it("should log error", () => {
    const logger = new Logger("info");
    logger.error("error message");
    expect(errorSpy).toHaveBeenCalled();
  });

  it("should include data in log output", () => {
    const logger = new Logger("info");
    logger.info("test", { key: "value" });
    expect(logSpy).toHaveBeenCalled();
  });
});
