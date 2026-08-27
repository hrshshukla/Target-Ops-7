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
    const credentialsDir = path.join(modConfig.modRequest.projectRoot, "config", "mappls");
    const credentials = [
      {
        source: "app1787810177396i1981201619.a_1787848537524.conf",
        destination: "mappls.a.conf",
      },
      {
        source: "app1787810177396i1981201619.a_1787848537524.olf",
        destination: "mappls.a.olf",
      },
    ];
    for (const credential of credentials) {
      const sourcePath = path.join(credentialsDir, credential.source);
      if (!fs.existsSync(sourcePath) || fs.statSync(sourcePath).size === 0) {
        throw new Error(`Missing Mappls credential file: config/mappls/${credential.source}`);
      }
      fs.copyFileSync(sourcePath, path.join(appDir, credential.destination));
    }
    return modConfig;
  }]);
};