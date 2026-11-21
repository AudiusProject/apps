const path = require('path')

const packages = {
  lodash: (member) => `lodash/${member}`,
  'react-use': (member) => `react-use/lib/${member}`
}

const memberExists = (request, filename) => {
  try {
    require.resolve(request, {
      paths: [path.dirname(filename), __dirname]
    })
    return true
  } catch {
    return false
  }
}

module.exports = ({ types: t }) => ({
  name: 'cherry-pick-imports',
  visitor: {
    ImportDeclaration(declaration, state) {
      const { node } = declaration
      const toMemberPath = packages[node.source.value]
      if (!toMemberPath || node.importKind === 'type') return
      const filename = state.filename ?? __filename
      const specifiers = node.specifiers.filter((s) => s.importKind !== 'type')
      const rewritable =
        specifiers.length > 0 &&
        specifiers.every(
          (s) =>
            t.isImportSpecifier(s) &&
            memberExists(
              toMemberPath(s.imported.name ?? s.imported.value),
              filename
            )
        )
      if (!rewritable) return
      declaration.replaceWithMultiple(
        specifiers.map((s) =>
          t.importDeclaration(
            [t.importDefaultSpecifier(t.identifier(s.local.name))],
            t.stringLiteral(toMemberPath(s.imported.name ?? s.imported.value))
          )
        )
      )
    }
  }
})
