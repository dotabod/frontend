import {
  BRFlag,
  CZFlag,
  ESFlag,
  HUFlag,
  IRFlag,
  ITFlag,
  PTFlag,
  RUFlag,
  TRFlag,
  UAFlag,
  USFlag,
} from 'mantine-flagpack'
import { FlagProps } from 'mantine-flagpack/declarations/create-flag'

export const localeOptions: {
  Flag: ({ radius, sx, ...others }: FlagProps) => JSX.Element
  label: string
  value: string
}[] = [
  {
    label: 'English',
    value: 'en',
    Flag: USFlag,
  },
  {
    label: 'Italian',
    value: 'it',
    Flag: ITFlag,
  },
  {
    label: 'Ukrainian',
    value: 'uk-UA',
    Flag: UAFlag,
  },
  {
    label: 'Russian',
    value: 'ru',
    Flag: RUFlag,
  },
  {
    label: 'Spanish',
    value: 'es',
    Flag: ESFlag,
  },
  {
    label: 'Hungarian',
    value: 'hu',
    Flag: HUFlag,
  },
  {
    label: 'Turkish',
    value: 'tr',
    Flag: TRFlag,
  },
  {
    label: 'Persian',
    value: 'fa',
    Flag: IRFlag,
  },
  {
    label: 'Brazilian Portuguese',
    value: 'pt-BR',
    Flag: BRFlag,
  },
  {
    label: 'Portuguese',
    value: 'pt',
    Flag: PTFlag,
  },
  {
    label: 'Czech',
    value: 'cs',
    Flag: CZFlag,
  },
].sort((a, b) => (a.label > b.label ? 1 : -1))
