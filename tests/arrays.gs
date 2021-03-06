test "empty", #
  let arr = []
  ok is-array! arr
  eq 0, arr.length

test "simple, single-line", #
  let arr = ["alpha", "bravo", "charlie"]
  
  eq 3, arr.length
  eq "alpha", arr[0]
  eq "bravo", arr[1]
  eq "charlie", arr[2]

/*
test "single-line, missing commas", #
  throws #-> gorilla.compile("""let x = 0
  ["alpha" "bravo" "charlie"]"""), #(e) -> e.line == 2
*/
test "trailing comma", #
  let arr = ["alpha", "bravo", "charlie",]
  eq 3, arr.length
  eq "alpha", arr[0]
  eq "bravo", arr[1]
  eq "charlie", arr[2]

test "multi-line, with commas", #
  let arr = [
    "alpha",
    "bravo",
    "charlie"
  ]
  array-eq ["alpha", "bravo", "charlie"], arr

test "multi-line, no commas", #
  let arr = [
    "alpha"
    "bravo"
    "charlie"
  ]
  array-eq ["alpha", "bravo", "charlie"], arr

test "multi-line, mixed commas", #
  let arr = [
    "alpha"
    "bravo",
    "charlie"
  ]
  array-eq ["alpha", "bravo", "charlie"], arr

test "multi-line, matrix-style", #
  let arr = [
    1, 2, 3
    4, 5, 6
    7, 8, 9
  ]
  array-eq [1, 2, 3, 4, 5, 6, 7, 8, 9], arr

test "objects in multi-line array", #
  let arr = [
    { a: 1 }
    { b: 2 }
    { c: 3 }
  ]
  eq 3, arr.length
  eq 1, arr[0].a
  eq 2, arr[1].b
  eq 3, arr[2].c

test "array spreads", #
  let arr = ["alpha", "bravo", "charlie"]
  
  array-eq ["alpha", "bravo", "charlie", "delta"], [...arr, "delta"]
  array-eq ["delta", "alpha", "bravo", "charlie"], ["delta", ...arr]
  array-eq [["alpha", "bravo", "charlie"], "delta"], [...[arr], "delta"]
  array-eq ["delta", ["alpha", "bravo", "charlie"]], ["delta", ...[arr]]
  let arr2 = [arr]
  array-eq [["alpha", "bravo", "charlie"], "delta"], [...arr2, "delta"]
  array-eq ["delta", ["alpha", "bravo", "charlie"]], ["delta", ...arr2]
  
  array-eq arr, [...arr]
  ok arr != [...arr]

test "multiple array spreads", #
  let alpha = [1, 2, 3]
  let bravo = [4, 5, 6]
  
  array-eq [1, 2, 3, 4, 5, 6], [...alpha, ...bravo]
  array-eq [4, 5, 6, 1, 2, 3], [...bravo, ...alpha]
  array-eq ["charlie", 1, 2, 3, 4, 5, 6], ["charlie", ...alpha, ...bravo]
  array-eq ["charlie", 1, 2, 3, "delta", 4, 5, 6], ["charlie", ...alpha, "delta", ...bravo]
  array-eq ["charlie", 1, 2, 3, "delta", 4, 5, 6, "echo"], ["charlie", ...alpha, "delta", ...bravo, "echo"]
  array-eq [1, 2, 3, "delta", 4, 5, 6], [...alpha, "delta", ...bravo]
  array-eq [1, 2, 3, "delta", 4, 5, 6, "echo"], [...alpha, "delta", ...bravo, "echo"]
  array-eq [1, 2, 3, 4, 5, 6, "echo"], [...alpha, ...bravo, "echo"]

test "immediate index", #
  eq "alpha", ["alpha"][0]
  eq Array::slice, [].slice

test "array containment", #
  let array = ["alpha", "bravo", "charlie"]
  ok "alpha" in array
  ok "bravo" in array
  ok "charlie" in array
  ok not ("delta" in array)
  ok "delta" not in array

test "array containment with literal array", #
  ok "alpha" in ["alpha", "bravo", "charlie"]
  ok "bravo" in ["alpha", "bravo", "charlie"]
  ok "charlie" in ["alpha", "bravo", "charlie"]
  ok not ("delta" in ["alpha", "bravo", "charlie"])
  ok "delta" not in ["alpha", "bravo", "charlie"]

test "array containment does not calculate key more than once", #
  let get-key = run-once "charlie"
  
  let array = ["alpha", "bravo", "charlie"]
  ok get-key() in array
  ok get-key.ran

test "array containment does not calculate key more than once with literal array", #
  let get-key = run-once "charlie"
  
  ok get-key() in ["alpha", "bravo", "charlie"]
  ok get-key.ran

test "array containment calculates key at least once with literal array, even if empty", #
  let get-key = run-once "charlie"
  
  ok get-key() not in []
  ok get-key.ran

test "array containment does not calculate array more than once", #
  let get-array = run-once ["alpha", "bravo", "charlie"]

  ok "charlie" in get-array()

/*
test "array with holes", #
  array-eq ["alpha", undefined, "bravo"], ["alpha",,"bravo"]
  array-eq ["alpha", undefined, undefined, "bravo"], ["alpha",,,"bravo"]
  array-eq ["alpha", undefined, undefined, undefined, "bravo"], ["alpha",,,,"bravo"]
  array-eq ["alpha", undefined, undefined, undefined, "bravo"], ["alpha",,,,"bravo",]
  array-eq ["alpha", undefined, undefined, undefined, "bravo", undefined], ["alpha",,,,"bravo",,]
  array-eq [undefined, "alpha", undefined, undefined, undefined, "bravo", undefined], [,"alpha",,,,"bravo",,]
  array-eq [undefined, undefined, "alpha", undefined, undefined, undefined, "bravo", undefined], [,,"alpha",,,,"bravo",,]
  array-eq [undefined], [,]
  array-eq [undefined, undefined], [,,]
*/

test "multiple access", #
  let array = ["alpha", "bravo", "charlie", "delta", "echo"]
  
  array-eq ["alpha", "charlie", "echo"], array[0, 2, 4]

test "multiple access only accesses object once", #
  let array = run-once ["alpha", "bravo", "charlie", "delta", "echo"]
  
  array-eq ["alpha", "charlie", "echo"], array()[0, 2, 4]

/*
test "multiple assignment", #
  let array = ["alpha", "bravo", "charlie", "delta", "echo"]
  
  array[0, 2, 4] := ["foxtrot", "golf", "hotel"]
  array-eq ["foxtrot", "bravo", "golf", "delta", "hotel"], array
  
  let x = array[1, 3] := ["india", "juliet"]
  array-eq ["foxtrot", "india", "golf", "juliet", "hotel"], array
  array-eq ["india", "juliet"], x
*/

test "slicing", #
  let array = ["a", "b", "c", "d", "e"]
  
  array-eq array, array[0 to -1]
  ok array != array[0 to -1]
  
  array-eq ["b", "c", "d", "e"], array[1 to -1]
  array-eq ["e"], array[-1 to -1]
  array-eq ["c", "d", "e"], array[2 to -1]
  array-eq ["a", "b", "c"], array[0 to 2]
  array-eq ["a", "b", "c"], array[0 til 3]
  array-eq ["a", "b", "c", "d"], array[0 til -1]
  array-eq ["b", "c", "d"], array[1 to 3]
  array-eq ["b", "c", "d"], array[1 til 4]
  array-eq ["e"], array[4 to -1]
  array-eq [], array[5 to -1]
  array-eq ["d", "e"], array[-2 to -1]
  array-eq [], array[4 to 3]
  array-eq [], array[4 til 4]
  
  let slice(get-array, get-left, get-right, inclusive)
    if inclusive
      get-array()[get-left() to get-right()]
    else
      get-array()[get-left() til get-right()]
  
  array-eq array, slice run-once(array), run-once(0), run-once(-1), true
  ok array != slice run-once(array), run-once(0), run-once(-1), true
  array-eq ["b", "c", "d", "e"], slice run-once(array), run-once(1), run-once(-1), true
  array-eq ["e"], slice run-once(array), run-once(-1), run-once(-1), true
  array-eq ["c", "d", "e"], slice run-once(array), run-once(2), run-once(-1), true
  array-eq ["a", "b", "c"], slice run-once(array), run-once(0), run-once(2), true
  array-eq ["a", "b", "c"], slice run-once(array), run-once(0), run-once(3), false
  array-eq ["a", "b", "c", "d"], slice run-once(array), run-once(0), run-once(-1), false
  array-eq ["b", "c", "d"], slice run-once(array), run-once(1), run-once(3), true
  array-eq ["b", "c", "d"], slice run-once(array), run-once(1), run-once(4), false
  array-eq ["e"], slice run-once(array), run-once(4), run-once(-1), true
  array-eq [], slice run-once(array), run-once(5), run-once(-1), true
  array-eq ["d", "e"], slice run-once(array), run-once(-2), run-once(-1), true
  array-eq [], slice run-once(array), run-once(4), run-once(3), true
  array-eq [], slice run-once(array), run-once(4), run-once(4), false

test "slicing with step", #
  let array = ["a", "b", "c", "d", "e"]
  
  array-eq array, array[0 to -1 by 1]
  ok array != array[0 to -1 by 1]
  
  array-eq ["e", "d", "c", "b", "a"], array[-1 to 0 by -1]
  array-eq ["e", "c", "a"], array[-1 to 0 by -2]
  array-eq ["a", "c", "e"], array[0 to -1 by 2]
  array-eq ["b", "c", "d", "e"], array[1 to -1 by 1]
  array-eq ["e", "d", "c", "b"], array[-1 to 1 by -1]
  array-eq ["e", "c"], array[-1 to 1 by -2]
  array-eq ["e"], array[-1 to -1 by 100]
  array-eq ["c", "e"], array[2 to -1 by 2]
  array-eq ["e", "c"], array[-1 to 2 by -2]
  array-eq ["a", "c"], array[0 to 2 by 2]
  array-eq ["c", "a"], array[2 to 0 by -2]
  array-eq ["a", "d"], array[0 til -1 by 3]
  array-eq ["b", "d"], array[1 to 3 by 2]
  array-eq ["b", "d"], array[1 til 4 by 2]
  array-eq ["d", "b"], array[3 to 1 by -2]
  array-eq ["d", "b"], array[3 til 0 by -2]
  array-eq ["e"], array[4 to -1 by 1]
  array-eq [], array[5 to -1 by 1]
  array-eq ["c", "e"], array[-3 to -1 by 2]
  array-eq [], array[4 to 3 by 1]
  array-eq [], array[4 til 4 by 1]
  array-eq ["e"], array[4 to -1 by -1]
  array-eq ["e"], array[5 to -1 by -1]
  array-eq ["e", "c"], array[-1 to -3 by -2]
  array-eq [], array[3 to 4 by -1]
  array-eq [], array[4 til 4 by -1]
  
  let slice(get-array, get-left, get-right, get-step, inclusive)
    if inclusive
      get-array()[get-left() to get-right() by get-step()]
    else
      get-array()[get-left() til get-right() by get-step()]
  
  array-eq array, slice run-once(array), run-once(0), run-once(-1), run-once(1), true
  ok array != slice run-once(array), run-once(0), run-once(-1), run-once(1), true
  array-eq ["e", "d", "c", "b", "a"], slice run-once(array), run-once(-1), run-once(0), run-once(-1), true
  array-eq ["e", "c", "a"], slice run-once(array), run-once(-1), run-once(0), run-once(-2), true
  array-eq ["a", "c", "e"], slice run-once(array), run-once(0), run-once(-1), run-once(2), true
  array-eq ["b", "c", "d", "e"], slice run-once(array), run-once(1), run-once(-1), run-once(1), true
  array-eq ["e", "d", "c", "b"], slice run-once(array), run-once(-1), run-once(1), run-once(-1), true
  array-eq ["e", "c"], slice run-once(array), run-once(-1), run-once(1), run-once(-2), true
  array-eq ["e"], slice run-once(array), run-once(-1), run-once(-1), run-once(100), true
  array-eq ["c", "e"], slice run-once(array), run-once(2), run-once(-1), run-once(2), true
  array-eq ["e", "c"], slice run-once(array), run-once(-1), run-once(2), run-once(-2), true
  array-eq ["a", "c"], slice run-once(array), run-once(0), run-once(2), run-once(2), true
  array-eq ["c", "a"], slice run-once(array), run-once(2), run-once(0), run-once(-2), true
  array-eq ["a", "d"], slice run-once(array), run-once(0), run-once(-1), run-once(3), false
  array-eq ["b", "d"], slice run-once(array), run-once(1), run-once(3), run-once(2), true
  array-eq ["b", "d"], slice run-once(array), run-once(1), run-once(4), run-once(2), false
  array-eq ["d", "b"], slice run-once(array), run-once(3), run-once(1), run-once(-2), true
  array-eq ["d", "b"], slice run-once(array), run-once(3), run-once(0), run-once(-2), false
/*
test "splicing", #
  let array = []
  
  array[:] := ["a", "b", "c"]
  array-eq ["a", "b", "c"], array
  
  array[:] := ["d", "e", "f"]
  array-eq ["d", "e", "f"], array
  
  array[1:] := ["g", "h"]
  array-eq ["d", "g", "h"], array
  
  array[:1] := ["i", "j"]
  array-eq ["i", "j", "g", "h"], array
  
  let result = array[2:] := ["k", "l"]
  array-eq ["i", "j", "k", "l"], array
  array-eq ["k", "l"], result
  
  array[2:2] := ["m", "n"]
  array-eq ["i", "j", "m", "n", "k", "l"], array
  
  array[-1:] := ["o", "p"]
  array-eq ["i", "j", "m", "n", "k", "o", "p"], array
  
  array[-2:-1] := ["q", "r"]
  array-eq ["i", "j", "m", "n", "k", "q", "r", "p"], array
  
  array[1:-1] := ["s", "t"]
  array-eq ["i", "s", "t", "p"], array
  
  array[:-1] := ["u", "v"]
  array-eq ["u", "v", "p"], array
*/
test "unclosed array syntax, multi-line", #
  let arr =
    * 1
    * 2
    * 3
    * 4
  
  array-eq [1, 2, 3, 4], arr

test "unclosed array syntax, single item", #
  let arr =
    * 1
  
  array-eq [1], arr

test "unclosed array syntax in invocation, multi-line", #
  let f(a) -> a
  let arr = f
    * 1
    * 2
    * 3
    * 4
  
  array-eq [1, 2, 3, 4], arr

test "unclosed array syntax in invocation with leading args, multi-line", #
  let f(a, b, o) -> [a, b, o]
  let arr = f 1, 2,
    * 3
    * 4
  
  array-eq [1, 2, [3, 4]], arr

test "unclosed array syntax as function return", #
  let f()
    * 1
    * 2
    * 3
    * 4
  let arr = f()
  array-eq [1, 2, 3, 4], arr

test "multi-level unclosed array syntax", #
  let x =
    * 1
    * 2
    *
      * 3
      * 4
    * * 5
      * * 6
        * 7
      * 8
    * 9
  
  array-eq [1, 2, [3, 4], [5, [6, 7], 8], 9], x
