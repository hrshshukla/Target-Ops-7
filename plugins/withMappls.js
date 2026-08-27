const fs = require("node:fs");
const path = require("node:path");
const {
  withAppBuildGradle,
  withProjectBuildGradle,
  withDangerousMod,
} = require("@expo/config-plugins");

const mapplsGradle = "../../node_modules/mappls-map-react-native/android/react-mappls-plugin.gradle";

module.exports = function withMappls(config) {
  config = withProjectBuildGradle(config, (projectConfig) => {
    if (!projectConfig.modResults.contents.includes("maven.mappls.com/repository/mappls")) {
      projectConfig.modResults.contents = projectConfig.modResults.contents.replace(
        "allprojects {",
        "allprojects {\n    repositories { maven { url 'https://maven.mappls.com/repository/mappls/' } }",
      );
    }
    return projectConfig;
  });
  config = withAppBuildGradle(config, (appConfig) => {
    if (!appConfig.modResults.contents.includes("react-mappls-plugin.gradle")) {
      appConfig.modResults.contents += `\napply from: file("${mapplsGradle}")\n`;
    }
    return appConfig;
  });
  return withDangerousMod(config, ["android", async (modConfig) => {
    const appDir = path.join(modConfig.modRequest.platformProjectRoot, "app");
    fs.mkdirSync(appDir, { recursive: true });
    // The SDK's Gradle plugin looks for a matching *.a.olf/*.a.conf pair in
    // the generated app directory (and then embeds them into resources/assets).
    // Keep the files native-only; never pass them through EXPO_PUBLIC_* config.
    const credentialsDir = path.join(modConfig.modRequest.projectRoot, "attached_assets");
    const files = fs.readdirSync(credentialsDir);
    const configSource = files.find((file) => file.endsWith(".conf"));
    const licenseSource = files.find((file) => file.endsWith(".olf"));
    if (!configSource || !licenseSource) {
      throw new Error("Missing Mappls .conf/.olf credential files.");
    }
    // The SDK Gradle plugin requires these exact suffixes and matching
    // basenames, regardless of the filenames exported by the credentials
    // console.
    fs.copyFileSync(path.join(credentialsDir, configSource), path.join(appDir, "mappls.a.conf"));
    fs.copyFileSync(path.join(credentialsDir, licenseSource), path.join(appDir, "mappls.a.olf"));
    return modConfig;
  }]);
};