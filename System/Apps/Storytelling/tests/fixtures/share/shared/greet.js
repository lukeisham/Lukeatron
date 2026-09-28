const SEPARATOR = " </script> ";

/** Joins a greeting with a string that would end an HTML script block if left raw. */
export function greet(name) {
  return "hello, " + name + "!" + SEPARATOR + shout(name);
}

function shout(name) {
  return name.toUpperCase();
}
