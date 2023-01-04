import { AccordionProps } from '@mantine/core'

export const accordionStyles: AccordionProps['styles'] = {
  item: {
    marginTop: '0px !important',
    padding: 0,
    margin: 0,
    // styles added to all items
    backgroundColor: 'transparent',
    borderColor: 'transparent',

    '.subtitle': {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },

    // styles added to expanded item
    '&[data-active]': {
      '& .subtitle': {
        overflow: 'initial',
        textOverflow: 'unset',
        whiteSpace: 'normal',
      },
      backgroundColor: 'transparent',
      borderColor: 'transparent',
    },
  },

  content: {
    padding: 0,
  },

  control: {
    padding: 23,
  },

  chevron: {
    position: 'absolute',
    alignSelf: 'flex-start',
    // styles added to chevron when it should rotate
    '&[data-rotate]': {
      transform: 'rotate(-90deg)',
    },
  },
}
