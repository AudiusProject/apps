export const interleave = <A, B>([x, ...xs]: A[], ys: B[] = []): (A | B)[] =>
  x === undefined ? ys : [x, ...interleave(ys, xs)]
