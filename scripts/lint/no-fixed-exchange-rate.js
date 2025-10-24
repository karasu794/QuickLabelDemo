/**
 * 簡易ASTルール: 固定為替レート 0.0067 を検出
 * 使い方: eslint --rulesdir scripts/lint --rule no-fixed-exchange-rate:error src
 */
module.exports = {
  meta: { type: 'problem' },
  create(context) {
    const disallow = new Set((context.options && context.options[0]) || ['0.0067'])
    function reportIfLiteral(node) {
      if (node && node.type === 'Literal' && typeof node.value === 'number') {
        if (disallow.has(node.raw) || disallow.has(String(node.value))) {
          context.report({ node, message: `固定為替レートの直書きは禁止です: ${node.raw}` })
        }
      }
    }
    return {
      Literal: reportIfLiteral,
      BinaryExpression(node) {
        reportIfLiteral(node.left)
        reportIfLiteral(node.right)
      },
      VariableDeclarator(node) {
        reportIfLiteral(node.init)
      },
    }
  },
}


