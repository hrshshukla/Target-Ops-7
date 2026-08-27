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
    const credentialsDir = path.join(modConfig.modRequest.projectRoot, "assets", "mappls");
    for (const extension of [".a.conf", ".a.olf"]) {
      const source = fs.readdirSync(credentialsDir).find((file) => file.endsWith(extension));
      if (!source) throw new Error(`Missing Mappls credential file ${extension}`);
      fs.copyFileSync(path.join(credentialsDir, source), path.join(appDir, source));
    }
    return modConfig;
  }]);
};