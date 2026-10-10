// print.js — the one way this page reaches paper. Printing the
// whole project is a plain window.print() plus the @media print rules in
// print.css — this file needs no knowledge of what those hide.

/** Print the current project page as-is. */
export function printProject() {
  window.print();
}
