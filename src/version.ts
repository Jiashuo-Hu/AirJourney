import packageInfo from "../package.json";
export const APP_VERSION = `v${packageInfo.version.split(".").slice(0, 2).join(".")}`;
