// Google Translate moves React-owned text nodes into <font> wrappers. React then
// calls removeChild/insertBefore on a parent that no longer holds the node, the
// browser throws NotFoundError, and the page falls into the error boundary.
// Skip those calls instead of throwing: https://github.com/facebook/react/issues/11538
export const guardDomAgainstTranslation = function guardDomAgainstTranslation() {
  if (!('Node' in globalThis)) {
    return
  }

  // oxlint-disable-next-line typescript/unbound-method -- re-applied with .call(this) below
  const originalRemoveChild = Node.prototype.removeChild
  Node.prototype.removeChild = function removeChild<T extends Node>(this: Node, child: T): T {
    if (child.parentNode === this) {
      originalRemoveChild.call(this, child)
    }
    return child
  }

  // oxlint-disable-next-line typescript/unbound-method -- re-applied with .call(this) below
  const originalInsertBefore = Node.prototype.insertBefore
  Node.prototype.insertBefore = function insertBefore<T extends Node>(
    this: Node,
    node: T,
    child: Node | null,
  ): T {
    if (child === null || child.parentNode === this) {
      originalInsertBefore.call(this, node, child)
    }
    return node
  }
}
