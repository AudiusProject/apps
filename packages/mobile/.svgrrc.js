module.exports = {
  template: require('../../svgr-template'),
  titleProp: true,
  descProp: true,
  replaceAttrValues: {
    '#FF0000': '{props.fill}',
    '#000000': '{fillSecondary}'
  }
}
