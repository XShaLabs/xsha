import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const loadModularTranslations = async (locale: string) => {
  try {
    const [
      common,
      auth,
      navigation,
      errors,
      dashboard,
      gitCredentials,
      projects,
      adminLogs,
      devEnvironments,
      tasks,
      taskConversations,
      gitDiff,
      systemConfig,
    ] = await Promise.all([
      import(`./locales/${locale}/common.json`),
      import(`./locales/${locale}/auth.json`),
      import(`./locales/${locale}/navigation.json`),
      import(`./locales/${locale}/errors.json`),
      import(`./locales/${locale}/dashboard.json`),
      import(`./locales/${locale}/git-credentials.json`),
      import(`./locales/${locale}/projects.json`),
      import(`./locales/${locale}/admin-logs.json`),
      import(`./locales/${locale}/dev-environments.json`),
      import(`./locales/${locale}/tasks.json`),
      import(`./locales/${locale}/task-conversations.json`),
      import(`./locales/${locale}/git-diff.json`),
      import(`./locales/${locale}/system-config.json`),
    ]);

    return {
      common: common.default,
      auth: auth.default,
      navigation: navigation.default,
      errors: errors.default,
      dashboard: dashboard.default,
      gitCredentials: gitCredentials.default,
      projects: projects.default,
      adminLogs: adminLogs.default,
      dev_environments: devEnvironments.default,
      tasks: tasks.default,
      taskConversation: taskConversations.default,
      gitDiff: gitDiff.default,
      "system-config": systemConfig.default,
    };
  } catch (error) {
    console.error(`Failed to load translations for locale: ${locale}`, error);
    throw error;
  }
};

const initializeI18n = async () => {
  try {
    const [zhCN, enUS] = await Promise.all([
      loadModularTranslations("zh-CN"),
      loadModularTranslations("en-US"),
    ]);

    const resources = {
      "zh-CN": {
        translation: zhCN,
      },
      "en-US": {
        translation: enUS,
      },
    };

    await i18n
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        resources,
        fallbackLng: "en-US",
        detection: {
          order: ["localStorage", "navigator", "htmlTag"],
          caches: ["localStorage"],
          lookupLocalStorage: "i18nextLng",
        },
        interpolation: {
          escapeValue: false,
        },
        debug: import.meta.env.NODE_ENV === "development",
      });

    console.log("✅ i18n initialized successfully with modular translations");
  } catch (error) {
    console.error("❌ Failed to initialize i18n:", error);
    throw error;
  }
};

export { initializeI18n };
export default i18n;
