const {
  withAppBuildGradle,
  withGradleProperties,
  withProjectBuildGradle,
} = require("expo/config-plugins");
module.exports = (config) => {
  config = withProjectBuildGradle(config, (result) => {
    if (!result.modResults.contents.includes("FLOCO_CODEGEN_DIR"))
      result.modResults.contents +=
        '\nif (System.getenv("FLOCO_CODEGEN_DIR")) {\n subprojects { p -> p.plugins.withId("com.facebook.react") {\n  def reactConfig = p.extensions.findByName("react")\n  if (p.path != ":app" && reactConfig != null) { reactConfig.codegenDir.set(file(System.getenv("FLOCO_CODEGEN_DIR"))); reactConfig.reactNativeDir.set(new File(file(System.getenv("FLOCO_CODEGEN_DIR")).parentFile.parentFile, "react-native")) }\n } }\n}\n';
    return result;
  });
  config = withGradleProperties(config, (result) => {
    const values = {
      "org.gradle.jvmargs": "-Xmx4096m -XX:MaxMetaspaceSize=1536m",
      "kotlin.incremental": "false",
      "kotlin.compiler.execution.strategy": "in-process",
    };
    result.modResults = result.modResults.filter((x) => !values[x.key]);
    for (const [key, value] of Object.entries(values))
      result.modResults.push({ type: "property", key, value });
    return result;
  });
  return withAppBuildGradle(config, (result) => {
    if (!result.modResults.contents.includes("CMAKE_OBJECT_PATH_MAX")) {
      result.modResults.contents = result.modResults.contents.replace(
        "defaultConfig {",
        'defaultConfig {\n        externalNativeBuild { cmake { arguments "-DCMAKE_OBJECT_PATH_MAX=240" } }',
      );
    }
    return result;
  });
};
