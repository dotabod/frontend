import useSWR from 'swr'
import { fetcher } from '../fetcher'

export interface Project {
  translateDuplicates: number
  tagsDetection: number
  glossaryAccess: boolean
  isMtAllowed: boolean
  hiddenStringsProofreadersAccess: boolean
  autoSubstitution: boolean
  exportTranslatedOnly: boolean
  skipUntranslatedStrings: boolean
  skipUntranslatedFiles: boolean
  exportApprovedOnly: boolean
  autoTranslateDialects: boolean
  useGlobalTm: boolean
  normalizePlaceholder: boolean
  saveMetaInfoInSource: boolean
  inContext: boolean
  inContextProcessHiddenStrings: boolean
  inContextPseudoLanguageId: string
  inContextPseudoLanguage: Language
  isSuspended: boolean
  qaCheckIsActive: boolean
  qaCheckCategories: { [key: string]: boolean }
  languageMapping: LanguageMapping
  notificationSettings: NotificationSettings
  id: number
  userId: number
  sourceLanguageId: string
  targetLanguageIds: string[]
  languageAccessPolicy: string
  name: string
  cname: string
  identifier: string
  description: string
  visibility: string
  logo: string
  publicDownloads: boolean
  createdAt: Date
  updatedAt: Date
  lastActivity: Date
  targetLanguages: Language[]
}

export interface Language {
  id: string
  name: string
  editorCode: string
  twoLettersCode: string
  threeLettersCode: string
  locale: string
  androidCode: string
  osxCode: string
  osxLocale: string
  pluralCategoryNames: string[]
  pluralRules: string
  pluralExamples: string[]
  textDirection: string
  dialectOf: null | string
}

export interface LanguageMapping {
  uk: Uk
}

export interface Uk {
  name: string
  two_letters_code: string
  three_letters_code: string
  locale: string
  locale_with_underscore: string
  android_code: string
  osx_code: string
  osx_locale: string
}

export interface NotificationSettings {
  translatorNewStrings: boolean
  managerNewStrings: boolean
  managerLanguageCompleted: boolean
}

export interface CrowdinLanguage {
  data: {
    languageId: string
    words: {
      total: number
      translated: number
      approved: number
    }
    phrases: {
      total: number
      translated: number
      approved: number
    }
    translationProgress: number
    approvalProgress: number
  }
}

export interface TranslationData {
  data: CrowdinLanguage[]
  pagination: {
    offset: number
    limit: number
  }
}

export const getLanguageProgress = (
  data:
    | {
        languageProgress: CrowdinLanguage[]
        project: Project
        total: number
        percentage: number
      }
    | undefined,
  locale: string,
) => {
  const language = data?.project?.targetLanguages?.find((x) => x.locale === locale)
  const progress = data?.languageProgress?.find((x) => x.data.languageId === language?.id)

  return progress
}

const useLanguageTranslations = ({ languageId }: { languageId: string }) => {
  const { data, isLoading } = useSWR<{
    languageProgress: CrowdinLanguage[]
    project: Project
    total: number | undefined
    percentage: number
  }>(languageId ? `/api/getLanguageProgress?languageId=${languageId}` : null, fetcher)

  return { data, isLoading }
}

export default useLanguageTranslations
