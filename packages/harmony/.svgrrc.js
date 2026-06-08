module.exports = {
  template: require('../../svgr-template'),
  titleProp: true,
  descProp: true,
  replaceAttrValues: {
    red: '{props.fill}',
    '#FF0000': '{props.fill}',
    '#000000': '{fillSecondary}'
  }
}
