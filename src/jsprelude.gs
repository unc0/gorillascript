macro do
  syntax body as (Body | (";", this as Statement))
    ASTE (#@ -> $body)()

// Precedences:
// 0: |>, <|
// 1: and, or, xor, ?, bitand, bitor, bitxor
// 2: ==, !=, ~=, !~=, is, isnt, <, <= (shared with <), >, >= (shared with >), %%
// 3: by
// 4: to, til
// 5: <=>
// 6: in, haskey, ownskey, instanceof, instanceofsome, <<<, >>>
// 7: &
// 8: min, max
// 9: biturshift, bitrshift, bitlshift
// 10: +, - (shared)
// 11: *, /, %, \ (shared)
// 12: ^
// 13: <<, >>

define operator binary and with precedence: 1
  @binary left, "&&", right

define operator binary or with precedence: 1
  @binary left, "||", right

define operator unary not with type: \boolean
  @mutate-last node or @noop(), (#(n)@ -> @unary "!", n), true

define operator unary typeof with type: \string
  @mutate-last node or @noop(), (#(n)@ -> @unary "typeof", n), true

define operator binary == with precedence: 2, maximum: 1, type: \boolean
  @binary left, "===", right

define operator binary != with precedence: 2, maximum: 1, type: \boolean
  ASTE not ($left == $right)

define operator binary ~= with precedence: 2, maximum: 1, type: \boolean
  @binary left, "==", right

define operator binary !~= with precedence: 2, maximum: 1, type: \boolean
  ASTE not ($left ~= $right)

define operator binary ~<, ~<= with precedence: 2, maximum: 1, type: \boolean
  // avoiding if statement for now
  @binary left, (op == "~<" and "<") or "<=", right

define operator binary ~>, ~>= with precedence: 2, maximum: 1, type: \boolean
  // avoiding if statement for now
  (op == "~>" and ASTE not ($left ~<= $right)) or ASTE not ($left ~< $right)

define operator unary throw with type: "none"
  @mutate-last node or @noop(), (#(n)@ -> @throw n), true

define operator unary post-inc! with type: \number
  @unary "++post", node

define operator unary post-dec! with type: \number
  @unary "--post", node

macro debugger
  syntax ""
    @debugger()

macro let
  syntax ident as Identifier, func as FunctionDeclaration
    @let ident, false, @type(func)
    @block
      * @var ident, false
      * @assign ident, "=", func

macro if, unless
  // this uses eval instead of normal operators since those aren't defined yet
  // thankfully the eval uses constant strings and turns into pure code
  syntax test as Logic, "then", body, else-ifs as ("else", "if", test as Logic, "then", body)*, else-body as ("else", this)?
    let dec(x) -> eval "x - 1"
    let f(i, current)@
      (i ~>= 0 and f(dec(i), @if(else-ifs[i].test, else-ifs[i].body, current))) or current
    @if((macro-name == \unless and ASTE not $test) or test, body, f(dec(else-ifs.length), else-body))

  syntax test as Logic, body as (BodyNoEnd | (";", this as Statement)), else-ifs as ("\n", "else", type as ("if" | "unless"), test as Logic, body as (BodyNoEnd | (";", this as Statement)))*, else-body as ("\n", "else", this as (BodyNoEnd | (";", this as Statement)))?, "end"
    let dec(x) -> eval "x - 1"
    let f(i, current)@
      if i ~>= 0 then f(dec(i), @if((if else-ifs[i].type == "unless" then (ASTE not $(else-ifs[i].test)) else else-ifs[i].test), else-ifs[i].body, current)) else current
    @if(if macro-name == \unless then ASTE not $test else test, body, f(dec(else-ifs.length), else-body))

macro continue
  syntax label as (Identifier|"")
    if @position == \expression
      throw Error "continue can only be used in a statement position"
    @continue label

macro break
  syntax label as (Identifier|"")
    if @position == \expression
      throw Error "break can only be used in a statement position"
    @break label

define operator unary ? with postfix: true, type: \boolean, label: \existential
  if @is-ident-or-tmp(node) and not @has-variable(node)
    ASTE typeof $node != \undefined and $node != null
  else
    ASTE $node !~= null

define operator unary is-void!, is-undefined! with type: \boolean
  if @is-ident-or-tmp(node) and not @has-variable(node)
    ASTE typeof $node == \undefined
  else
    ASTE $node == void

define operator unary is-null! with type: \boolean
  if @is-ident-or-tmp(node) and not @has-variable(node)
    ASTE typeof $node != \undefined and $node == null
  else
    ASTE $node == null

define operator unary is-string! with type: \boolean
  ASTE typeof $node == \string

define operator unary is-number! with type: \boolean
  ASTE typeof $node == \number

define operator unary is-boolean! with type: \boolean
  ASTE typeof $node == \boolean

define operator unary is-function! with type: \boolean
  ASTE typeof $node == \function

define operator unary is-array! with type: \boolean
  @mutate-last node or @noop(), (#(n)@ -> (@is-ident-or-tmp(n) and not @has-variable(n) and ASTE typeof $n == \object and __is-array($n)) or ASTE __is-array($n)), true

define operator unary is-object! with type: \boolean
  @mutate-last node or @noop(), (#(n)@ -> ASTE typeof $n == \object and $n != null), true

define helper GLOBAL = if not is-void! window then window else if not is-void! global then global else this

define helper __xor = #(x, y)
  if x
    not y and x
  else
    y or x

define operator binary ~& with precedence: 7, type: \string
  if @has-type(left, \numeric) and @has-type(right, \numeric)
    @binary @binary(@const(""), "+", left), "+", right
  else if @is-const(left) and @value(left) == "" and @is-type(right, \string)
    right
  else if @is-const(right) and @value(right) == "" and @is-type(left, \string)
    left
  else
    @binary left, "+", right

define operator assign := with type: \right
  @assign left, "=", right

define syntax DeclarableIdent = is-mutable as "mutable"?, ident as Identifier, as-type as ("as", this as Type)?
  if @is-ident-or-tmp(ident)
    type: \ident
    is-mutable: is-mutable == "mutable"
    ident: ident
    as-type: as-type
  else
    ident

define syntax DeclarableArray = "[", head as (Declarable|""), tail as (",", this as (Declarable|""))*, "]"
  type: \array
  elements: [head].concat(tail)

define syntax DeclarableObjectSingularPair = value as DeclarableIdent
  value := @macro-expand-1(value)
  {
    key: @name(value.ident)
    value
  }
define syntax DeclarableObjectDualPair = this as (key as ObjectKey, ":", value as Declarable)
define syntax DeclarableObjectPair = this as (DeclarableObjectDualPair | DeclarableObjectSingularPair)
define syntax DeclarableObject = "{", head as DeclarableObjectPair, tail as (",", this as DeclarableObjectPair)*, "}"
  type: \object
  pairs: [head].concat(tail)

define syntax Declarable = this as (DeclarableArray | DeclarableObject | DeclarableIdent)

macro let
  syntax declarable as Declarable, "=", value as ExpressionOrAssignment
    let inc(x) -> eval("x + 1")
    declarable := @macro-expand-1(declarable)
    if not declarable
      throw Error("Unknown declarable: " ~& String declarable)
    if declarable.type == \ident
      @let declarable.ident, declarable.is-mutable, if declarable.as-type then @to-type(declarable.as-type) else @type(value)
      @block
        * @var declarable.ident, declarable.is-mutable
        * @mutate-last value or @noop(), (#(n)@ -> @assign declarable.ident, "=", n), true
    else if declarable.type == \array
      let num-real-elements(i, acc)
        if i ~< declarable.elements.length
          num-real-elements inc(i), if declarable.elements[i] then inc(acc) else acc
        else
          acc
      if num-real-elements(0, 0) ~<= 1
        let handle(i)@
          if i ~< declarable.elements.length
            if declarable.elements[i]
              @macro-expand-1 AST let $(declarable.elements[i]) = $value[$i]
            else
              handle(inc(i))
          else
            value
        handle(0)
      else
        @maybe-cache value, #(set-value, value)@
          let handle(i, current-value, block)@
            if i ~< declarable.elements.length
              if declarable.elements[i]
                block.push @macro-expand-1 AST let $(declarable.elements[i]) = $current-value[$i]
                handle inc(i), value, block
              else
                handle inc(i), current-value, block
            else
              @block block
          handle 0, set-value, []
    else if declarable.type == \object
      if declarable.pairs.length == 1
        let handle(pair)@
          @macro-expand-1 AST let $(pair.value) = $value[$(pair.key)]
        handle(@macro-expand-1(declarable.pairs[0]))
      else
        @maybe-cache value, #(set-value, value)@
          let handle-pair(i, current-value, pair, block)@
            block.push @macro-expand-1 AST let $(pair.value) = $current-value[$(pair.key)]
            handle inc(i), value, block
          let handle(i, current-value, block)@
            if i ~< declarable.pairs.length
              handle-pair i, current-value, @macro-expand-1(declarable.pairs[i]), block
            else
              @block block
          handle 0, set-value, []
    else
      throw Error("Unknown declarable " ~& (String declarable) ~& " " ~& (String declarable?.constructor?.name))

macro return
  syntax node as Expression?
    if @in-generator and node
      throw Error "Cannot use valued return in a generator function"
    if node
      @mutate-last node or @noop(), (#(n)@ -> @return n), true
    else
      @return()

macro return?
  syntax node as Expression
    if @in-generator
      throw Error "Cannot use return in a generator function"
    @mutate-last node or @noop(), (#(n)@
      @maybe-cache n, #(set-n, n)@
        AST
          if $set-n?
            return $n), true

macro returnif
  syntax node as Expression
    if @in-generator
      throw Error "Cannot use return in a generator function"
    @mutate-last node or @noop(), (#(n)@
      if @is-type n, \boolean
        AST
          if $n
            return true
      else
        @maybe-cache n, #(set-n, n)@
          AST
            if $set-n
              return $n), true

macro returnunless
  syntax node as Expression
    if @in-generator
      throw Error "Cannot use return in a generator function"
    @mutate-last node or @noop(), (#(n)@
      if @is-type n, \boolean
        AST
          unless $n
            return false
      else
        @maybe-cache n, #(set-n, n)@
          AST
            unless $set-n
              return $n), true

define operator assign and=
  @maybe-cache-access left, #(set-left, left)@
    if @position == \expression
      ASTE $set-left and ($left := $right)
    else
      AST if $set-left
        $left := $right
      else
        $left

define operator assign or=
  @maybe-cache-access left, #(set-left, left)@
    if @position == \expression
      ASTE $set-left or ($left := $right)
    else
      AST if not $set-left
        $left := $right
      else
        $left

// let's define the unstrict operators first
define operator binary ~*, ~/, ~%, ~\ with precedence: 11, type: \number
  if op == "~\\"
    ASTE Math.floor $(@binary left, "/", right)
  else if op == "~*"
    @binary left, "*", right
  else if op == "~/"
    @binary left, "/", right
  else
    @binary left, "%", right

define operator assign ~*=, ~/=, ~%= with type: \number
  if @can-mutate-last(right) and @is-ident-or-tmp(left)
    @mutate-last right or @noop(), (#(n)@
      if op == "~*="
        @assign left, "*=", n
      else if op == "~/="
        @assign left, "/=", n
      else
        @assign left, "%=", n), true
  else
    if op == "~*="
      @assign left, "*=", right
    else if op == "~/="
      @assign left, "/=", right
    else
      @assign left, "%=", right

define operator assign ~\= with type: \number
  @maybe-cache-access left, #(set-left, left)
    ASTE $set-left := $left ~\ $right

define operator unary ~+, ~- with type: \number
  if @is-const(node)
    let mutable value = Number(@value(node))
    if op == "~-"
      let negate(x) -> eval("-x")
      value := negate value
    @const value
  else
    @mutate-last node or @noop(), (#(n)@ -> @unary if op == "~+" then "+" else "-", n), true

define operator binary ~+, ~- with precedence: 10, type: \number
  if op == "~+"
    if not @is-type right, \numeric
      @binary left, "-", ASTE ~-($right)
    else
      if not @is-type left, \numeric
        left := ASTE ~+($left)
      @binary left, "+", right
  else
    @binary left, "-", right

define operator binary ~^ with precedence: 12, right-to-left: true, type: \number
  if @is-const(right)
    let value = @value(right)
    if value == 0
      return AST
        $left
        1
    else if value == 0.5
      return ASTE Math.sqrt $left
    else if value == 1
      return ASTE ~+$left
    else if value == 2
      return @maybe-cache left, #(set-left, left)
        ASTE $set-left ~* $left
    else if value == 3
      return @maybe-cache left, #(set-left, left)
        ASTE $set-left ~* $left ~* $left
    else if value == ~-0.5
      return ASTE 1 ~/ Math.sqrt($left)
    else if value == ~-1
      return ASTE 1 ~/ $left
    else if value == ~-2
      return @maybe-cache left, #(set-left, left)
        ASTE 1 ~/ ($set-left ~* $left)
    else if value == ~-3
      return @maybe-cache left, #(set-left, left)
        ASTE 1 ~/ ($set-left ~* $left ~* $left)
  ASTE Math.pow $left, $right

define operator assign ~^= with type: \number
  @maybe-cache-access left, #(set-left, left)
    ASTE $set-left := $left ~^ $right

define operator assign ~+= with type: \number
  if @is-const(right)
    let value = @value(right)
    if value == 1
      return @unary "++", left
    else if value == ~-1
      return @unary "--", left
    else if is-number! value and not @is-type left, \numeric
      return @assign left, "-=", @const(~-value)
  
  if @is-type left, \numeric
    if @can-mutate-last(right) and @is-ident-or-tmp(left)
      @mutate-last right or @noop(), (#(mutable n)@
        if not @is-type n, \numeric
          n := ASTE ~+$n
        @assign left, "+=", n), true
    else
      if not @is-type right, \numeric
        right := ASTE ~+$right
      @assign left, "+=", right
  else
    if @can-mutate-last(right) and @is-ident-or-tmp(left)
      @mutate-last right or @noop(), (#(n)@ -> @assign left, "-=", ASTE ~-$n), true
    else
      @assign left, "-=", ASTE ~-$right

define operator assign ~-= with type: \number
  if @is-const(right)
    let value = @value(right)
    if value == 1
      return @unary "--", left
    else if value == ~-1
      return @unary "++", left
  if @can-mutate-last(right) and @is-ident-or-tmp(left)
    @mutate-last right or @noop(), (#(n)@ -> @assign left, "-=", n), true
  else
    @assign left, "-=", right

define operator binary ~bitlshift, ~bitrshift, ~biturshift with precedence: 9, maximum: 1, type: \number
  if op == "~bitlshift"
    @binary left, "<<", right
  else if op == "~bitrshift"
    @binary left, ">>", right
  else
    @binary left, ">>>", right

define operator assign ~bitlshift=, ~bitrshift=, ~biturshift= with type: \number
  if @can-mutate-last(right) and @is-ident-or-tmp(left)
    @mutate-last right or @noop(), (#(n)@
      if op == "~bitlshift="
        @assign left, "<<=", n
      else if op == "~bitrshift="
        @assign left, ">>=", n
      else
        @assign left, ">>>=", n), true
  else
    if op == "~bitlshift="
      @assign left, "<<=", right
    else if op == "~bitrshift="
      @assign left, ">>=", right
    else
      @assign left, ">>>=", right

define operator assign ~&= with type: \string
  if @can-mutate-last(right) and @is-ident-or-tmp(left)
    @mutate-last right or @noop(), (#(mutable n)@
      if @has-type(left, \numeric) and @has-type(n, \numeric)
        n := ASTE "" ~& n
      @assign left, "+=", n), true
  else
    if @has-type(left, \numeric) and @has-type(right, \numeric)
      right := ASTE "" ~& right
    @assign left, "+=", right

define helper __typeof = do
  let _to-string = Object.prototype.to-string
  #(o) as String
    if is-void! o
      "Undefined"
    else if is-null! o
      "Null"
    else
      (o.constructor and o.constructor.name) or _to-string@(o).slice(8, ~-1)

define operator unary typeof! with type: \string
  if @is-ident-or-tmp(node) and not @has-variable(node)
    ASTE if typeof $node == \undefined then "Undefined" else __typeof($node)
  else
    @mutate-last node or @noop(), (#(n)@ -> ASTE __typeof($n)), true

define helper __num = #(num) as Number
  if not is-number! num
    throw TypeError("Expected a number, got " ~& typeof! num)
  else
    num

define helper __str = #(str) as String
  if not is-string! str
    throw TypeError("Expected a string, got " ~& typeof! str)
  else
    str

define helper __strnum = #(strnum) as String
  let type = typeof strnum
  if type == \string
    strnum
  else if type == \number
    String(strnum)
  else
    throw TypeError("Expected a string or number, got " ~& typeof! strnum)

// strict operators, should have same precedence as their respective unstrict versions

define operator unary + with type: \number
  @mutate-last node or @noop(), (#(n)@
    if @is-type n, \number
      n
    else
      ASTE __num($n)), true

define operator unary - with type: \number
  if @is-const(node) and is-number! @value(node)
    @const(~-@value(node))
  else
    ASTE ~-(+$node)

define operator binary ^ with precedence: 12, right-to-left: true, type: \number
  ASTE +$left ~^ +$right

define operator assign ^= with type: \number
  @maybe-cache-access left, #(set-left, left)@
    ASTE $set-left := $left ^ $right

define operator binary *, /, %, \ with precedence: 11, type: \number
  if op == "*"
    ASTE +$left ~* +$right
  else if op == "/"
    ASTE +$left ~/ +$right
  else if op == "%"
    ASTE +$left ~% +$right
  else
    ASTE +$left ~\ +$right

define operator unary % with postfix: true, type: \number
  ASTE $node / 100

define operator binary +, - with precedence: 10, type: \number
  if op == "+"
    ASTE +$left ~+ +$right
  else
    ASTE +$left ~- +$right

define operator binary bitlshift, bitrshift, biturshift with precedence: 9, maximum: 1, type: \number
  if op == "bitlshift"
    ASTE +$left ~bitlshift +$right
  else if op == "bitrshift"
    ASTE +$left ~bitrshift +$right
  else
    ASTE +$left ~biturshift +$right

define operator assign \= with type: \number
  @maybe-cache-access left, #(set-left, left)@
    ASTE $set-left := $left \ $right

define operator binary & with precedence: 7, type: \string, label: \string-concat
  if not @is-type left, \string-or-number
    left := if not @has-type left, \number
      ASTE __str $left
    else
      ASTE __strnum $left
  if not @is-type right, \string-or-number
    right := if not @has-type right, \number
      ASTE __str $right
    else
      ASTE __strnum $right
  ASTE $left ~& $right

define operator assign &= with type: \string
  if @is-type left, \string
    ASTE $left ~&= "" & $right
  else
    @maybe-cache-access left, #(set-left, left)@
      ASTE $set-left := $left & $right

define operator binary in with precedence: 6, maximum: 1, invertible: true, type: \boolean
  if @is-array(right)
    let elements = @elements(right)
    if elements.length == 0
      if @is-complex(left)
        AST
          $left
          false
      else
        ASTE false
    else if elements.length == 1
      ASTE $left == $(elements[0])
    else
      let f(i, current, left)
        if i ~< elements.length
          f(i ~+ 1, ASTE $current or $left == $(elements[i]), left)
        else
          current
      @maybe-cache left, #(set-left, left)
        f(1, ASTE $set-left == $(elements[0]), left)
  else
    ASTE __in($left, $right)

define operator binary haskey with precedence: 6, maximum: 1, invertible: true, type: \boolean
  @binary right, \in, left

define helper __owns = Object.prototype.has-own-property

define operator binary ownskey with precedence: 6, maximum: 1, invertible: true, type: \boolean, label: \ownership
  ASTE __owns@($left, $right)

define operator binary instanceof with precedence: 6, maximum: 1, invertible: true, type: \boolean
  if @is-ident(right)
    if @name(right) == \String
      return ASTE is-string! $left
    else if @name(right) == \Number
      return ASTE is-number! $left
    else if @name(right) == \Boolean
      return ASTE is-boolean! $left
    else if @name(right) == \Function
      return ASTE is-function! $left
    else if @name(right) == \Array
      return ASTE is-array! $left
    else if @name(right) == \Object
      return ASTE is-object! $left
  @binary left, \instanceof, right

define helper __cmp = #(left, right) as Number
  if left == right
    0
  else
    let type = typeof left
    if type != \number and type != \string
      throw TypeError "Cannot compare a non-number/string: " ~& type
    else if type != typeof right
      throw TypeError "Cannot compare elements of different types: " ~& type ~& " vs " ~& typeof right
    else if left ~< right
      -1
    else
      1

define operator binary <=> with precedence: 5, maximum: 1, type: \number
  ASTE __cmp($left, $right)

define operator binary %% with precedence: 2, maximum: 1, invertible: true, type: \boolean
  ASTE $left % $right == 0

define operator binary ~%% with precedence: 2, maximum: 1, invertible: true, type: \boolean
  ASTE $left ~% $right == 0

define helper __int = #(num) as Number
  if not is-number! num
    throw TypeError("Expected a number, got " ~& typeof! num)
  else if num not ~%% 1
    throw TypeError("Expected an integer, got " ~& num)
  else
    num

define helper __nonzero = #(num)
  if num == 0
    throw RangeError("Expected non-zero, got " ~& num)
  else
    num

define helper __lt = #(x, y) as Boolean
  let type = typeof x
  if type not in [\number, \string]
    throw TypeError("Cannot compare a non-number/string: " ~& type)
  else if type != typeof y
    throw TypeError("Cannot compare elements of different types: " ~& type ~& " vs " ~& typeof y)
  else
    x ~< y

define helper __lte = #(x, y) as Boolean
  let type = typeof x
  if type not in [\number, \string]
    throw TypeError("Cannot compare a non-number/string: " ~& type)
  else if type != typeof y
    throw TypeError("Cannot compare elements of different types: " ~& type ~& " vs " ~& typeof y)
  else
    x ~<= y

define operator binary <, <= with precedence: 2, maximum: 1, type: \boolean
  if @is-type left, \number
    if @is-type right, \number
      if op == "<"
        ASTE $left ~< $right
      else
        ASTE $left ~<= $right
    else
      if op == "<"
        ASTE $left ~< __num($right)
      else
        ASTE $left ~<= __num($right)
  else if @is-type left, \string
    if @is-type right, \string
      if op == "<"
        ASTE $left ~< $right
      else
        ASTE $left ~<= $right
    else
      if op == "<"
        ASTE $left ~< __str($right)
      else
        ASTE $left ~<= __str($right)
  else if @is-type right, \number
    if op == "<"
      ASTE __num($left) ~< $right
    else
      ASTE __num($left) ~<= $right
  else if @is-type right, \string
    if op == "<"
      ASTE __str($left) ~< $right
    else
      ASTE __str($left) ~<= $right
  else if op == "<"
    ASTE __lt($left, $right)
  else
    ASTE __lte($left, $right)

define operator binary >, >= with precedence: 2, maximum: 1, type: \boolean
  if op == ">"
    ASTE not ($left <= $right)
  else
    ASTE not ($left < $right)

define operator binary ~min with precedence: 8
  @maybe-cache left, #(set-left, left)@
    @maybe-cache right, #(set-right, right)@
      ASTE if $set-left ~< $set-right then $left else $right

define operator binary ~max with precedence: 8
  @maybe-cache left, #(set-left, left)@
    @maybe-cache right, #(set-right, right)@
      ASTE if $set-left ~> $set-right then $left else $right

define operator binary min with precedence: 8
  @maybe-cache left, #(set-left, left)@
    @maybe-cache right, #(set-right, right)@
      ASTE if $set-left < $set-right then $left else $right

define operator binary max with precedence: 8
  @maybe-cache left, #(set-left, left)@
    @maybe-cache right, #(set-right, right)@
      ASTE if $set-left > $set-right then $left else $right

define operator binary xor with precedence: 1
  ASTE __xor($left, $right)

define operator binary ? with precedence: 1
  @maybe-cache left, #(set-left, left)@
    ASTE if $set-left? then $left else $right

define operator assign ~min=
  @maybe-cache-access left, #(set-left, left)@
    @maybe-cache right, #(set-right, right)@
      ASTE if $set-left ~> $set-right
        $left := $right
      else
        $left

define operator assign ~max=
  @maybe-cache-access left, #(set-left, left)@
    @maybe-cache right, #(set-right, right)@
      ASTE if $set-left ~< $set-right
        $left := $right
      else
        $left

define operator assign min=
  @maybe-cache-access left, #(set-left, left)@
    @maybe-cache right, #(set-right, right)@
      ASTE if $set-left > $set-right
        $left := $right
      else
        $left

define operator assign max=
  @maybe-cache-access left, #(set-left, left)@
    @maybe-cache right, #(set-right, right)@
      ASTE if $set-left < $set-right
        $left := $right
      else
        $left

define operator assign xor=
  @maybe-cache-access left, #(set-left, left)@
    ASTE $set-left := $left xor $right

define operator assign ?=
  @maybe-cache-access left, #(set-left, left)@
    @maybe-cache set-left, #(set-left, left-value)@
      if @position == \expression
        ASTE if $set-left? then $left-value else ($left := $right)
      else
        AST if not $set-left?
          $left := $right
        else
          $left-value

define operator binary ~bitand with precedence: 1, type: \number
  @binary left, "&", right

define operator binary ~bitor with precedence: 1, type: \number
  @binary left, "|", right

define operator binary ~bitxor with precedence: 1, type: \number
  @binary left, "^", right

define operator assign ~bitand=, ~bitor=, ~bitxor= with type: \number
  if @can-mutate-last(right) and @is-ident-or-tmp(left)
    @mutate-last right or @noop(), (#(n)@
      if op == "~bitand="
        @assign left, "&=", n
      else if op == "~bitor="
        @assign left, "|=", n
      else
        @assign left, "^=", n), true
  else
    if op == "~bitand="
      @assign left, "&=", right
    else if op == "~bitor="
      @assign left, "|=", right
    else
      @assign left, "^=", right

define operator binary bitand with precedence: 1, type: \number
  ASTE +$left ~bitand +$right

define operator binary bitor with precedence: 1, type: \number
  ASTE +$left ~bitor +$right

define operator binary bitxor with precedence: 1, type: \number
  ASTE +$left ~bitxor +$right

define operator unary ~bitnot with type: \number
  @mutate-last node or @noop(), (#(n)@ -> @unary "~", n), true

define operator unary bitnot with type: \number
  ASTE ~bitnot +$node

define operator unary delete with standalone: false
  if not @is-access(node)
    throw Error "Can only use delete on an access"
  if @position == \expression
    @maybe-cache-access node, #(set-node, node)@
      let tmp = @tmp \ref
      let del = @unary "delete", node
      AST
        let $tmp = $set-node
        $del
        $tmp
  else
    @unary "delete", node

define operator unary throw? with type: \undefined
  @maybe-cache node, #(set-node, node)
    ASTE if $set-node? then throw $node

define operator assign *=, /=, %=, +=, -=, bitlshift=, bitrshift=, biturshift=, bitand=, bitor=, bitxor= with type: \number
  if @is-type left, \number
    if op == "*="
      ASTE $left ~*= +$right
    else if op == "/="
      ASTE $left ~/= +$right
    else if op == "%="
      ASTE $left ~%= +$right
    else if op == "+="
      ASTE $left ~+= +$right
    else if op == "-="
      ASTE $left ~-= +$right
    else if op == "bitlshift="
      ASTE $left ~bitlshift= +$right
    else if op == "bitrshift="
      ASTE $left ~bitrshift= +$right
    else if op == "biturshift="
      ASTE $left ~biturshift= +$right
    else if op == "bitand="
      ASTE $left ~bitand= +$right
    else if op == "bitor="
      ASTE $left ~bitor= +$right
    else if op == "bitxor="
      ASTE $left ~bitxor= +$right
    else
      throw Error()
  else
    @maybe-cache-access left, #(set-left, left)@
      let action = if op == "*="
        ASTE $left * $right
      else if op == "/="
        ASTE $left / $right
      else if op == "%="
        ASTE $left % $right
      else if op == "+="
        ASTE $left + $right
      else if op == "-="
        ASTE $left - $right
      else if op == "bitlshift="
        ASTE $left bitlshift $right
      else if op == "bitrshift="
        ASTE $left bitrshift $right
      else if op == "biturshift="
        ASTE $left biturshift $right
      else if op == "bitand="
        ASTE $left bitand $right
      else if op == "bitor="
        ASTE $left bitor $right
      else if op == "bitxor="
        ASTE $left bitxor $right
      else
        throw Error()
      ASTE $set-left := $action

macro do
  syntax locals as (ident as Identifier, "=", value, rest as (",", ident as Identifier, "=", value)*)?, body as (Body | (";", this as Statement))
    let params = []
    let values = []
    if locals
      if locals.ident
        params.push @param locals.ident
        values.push locals.value
      let f(i)@
        if i < locals.rest.length
          if locals.rest[i].ident
            params.push @param locals.rest[i].ident
            values.push locals.rest[i].value
          f i + 1
      f 0
    @call(@func(params, body, true, true), values)

macro with
  syntax node as Expression, body as (Body | (";", this as Statement))
    let func = ASTE #-> $body
    ASTE $func@($node)

define helper __slice = Array.prototype.slice

define helper __freeze = if is-function! Object.freeze
  Object.freeze
else
  #(x) -> x

define helper __freeze-func = #(x)
  if x.prototype?
    __freeze(x.prototype)
  __freeze(x)

define helper __is-array = if is-function! Array.is-array
  Array.is-array
else
  do
    let _to-string = Object.prototype.to-string
    #(x) as Boolean -> _to-string@(x) == "[object Array]"

define helper __is-object = #(x) as Boolean -> typeof x == \object and x != null

define helper __to-array = #(x) as []
  if not x?
    throw TypeError "Expected an object, got " ~& typeof! x
  else if is-array! x
    x
  else if typeof x == \string
    x.split ""
  else
    __slice@ x

define helper __create = if is-function! Object.create
  Object.create
else
  #(x)
    let F() ->
    F.prototype := x
    new F()

define helper __pow = Math.pow
define helper __floor = Math.floor
define helper __sqrt = Math.sqrt
define helper __log = Math.log

macro for
  syntax reducer as (\every | \some | \first)?, init as (ExpressionOrAssignment|""), ";", test as (Logic|""), ";", step as (ExpressionOrAssignment|""), body as (BodyNoEnd | (";", this as Statement)), else-body as ("\n", "else", this as (BodyNoEnd | (";", this as Statement)))?, "end"
    init ?= @noop()
    test ?= ASTE true
    step ?= @noop()
    if reducer
      if reducer == \first
        body := @mutate-last body or @noop(), #(node) -> (AST return $node)
        let loop = @for(init, test, step, body)
        ASTE do
          $loop
          $else-body
      else
        if else-body
          throw Error "Cannot use a for loop with an else with $(reducer)"
        if reducer == \some
          body := @mutate-last body or @noop(), #(node) -> AST
            if $node
              return true
          let loop = [@for(init, test, step, body), (AST return false)]
          ASTE do
            $loop
        else if reducer == \every
          body := @mutate-last body or @noop(), #(node) -> AST
            if not $node
              return false
          let loop = [@for(init, test, step, body), (AST return true)]
          ASTE do
            $loop
        else
          throw Error("Unknown reducer: $reducer")
    else if else-body
      if @position == \expression
        throw Error("Cannot use a for loop with an else as an expression")
      let run-else = @tmp \else, false, \boolean
      body := AST
        $run-else := false
        $body
      init := AST
        $run-else := true
        $init
      let loop = @for(init, test, step, body)
      AST
        $loop
        if $run-else
          $else-body
    else if @position == \expression
      let arr = @tmp \arr, false, @type(body).array()
      body := @mutate-last body or @noop(), #(node) -> (ASTE $arr.push $node)
      init := AST
        $arr := []
        $init
      let loop = @for(init, test, step, body)
      AST
        $loop
        $arr
    else
      @for(init, test, step, body)
  
  syntax "reduce", init as (Expression|""), ";", test as (Logic|""), ";", step as (Statement|""), ",", current as Identifier, "=", current-start, body as (Body | (";", this as Statement))
    init ?= @noop()
    test ?= ASTE true
    step ?= @noop()
    
    body := @mutate-last body or @noop(), #(node) -> (ASTE $current := $node)
    AST
      let mutable $current = $current-start
      for $init; $test; $step
        $body
      $current

macro while, until
  syntax reducer as (\every | \some | \first)?, test as Logic, step as (",", this as ExpressionOrAssignment)?, body as (BodyNoEnd | (";", this as Statement)), else-body as ("\n", "else", this as (BodyNoEnd | (";", this as Statement)))?, "end"
    if macro-name == \until
      test := ASTE not $test
    
    if reducer == \every
      ASTE for every ; $test; $step
        $body
      else
        $else-body
    else if reducer == \some
      ASTE for some ; $test; $step
        $body
      else
        $else-body
    else if reducer == \first
      ASTE for first ; $test; $step
        $body
      else
        $else-body
    else if @position == \expression
      ASTE for ; $test; $step
        $body
      else
        $else-body
    else
      AST
        for ; $test; $step
          $body
        else
          $else-body
  
  syntax "reduce", test as Logic, step as (",", this as ExpressionOrAssignment)?, ",", current as Identifier, "=", current-start, body as (Body | (";", this as Statement))
    if macro-name == \until
      test := ASTE not $test
    
    AST
      for reduce ; $test; $step, $current = $current-start
        $body

define operator binary to with maximum: 1, precedence: 4, type: \array
  ASTE __range($left, $right, 1, true)

define operator binary til with maximum: 1, precedence: 4, type: \array
  ASTE __range($left, $right, 1, false)

define operator binary by with maximum: 1, precedence: 3, type: \array
  if not @has-type(right, \number)
    throw Error "Must provide a number to the 'by' operator"
  if @is-const(right) and @value(right) == 0
    throw Error "'by' step must be non-zero"
  if @is-call(left) and @is-ident(@call-func(left)) and @name(@call-func(left)) == \__range and not @call-is-apply(left)
    let call-args = @call-args(left)
    ASTE __range($(call-args[0]), $(call-args[1]), $right, $(call-args[3]))
  else
    if @is-const(right) and @value(right) not %% 1
      throw Error "'by' step must be an integer"
    ASTE __step($left, $right)

define helper __in = if is-function! Array.prototype.index-of
  do
    let index-of = Array.prototype.index-of
    #(child, parent) as Boolean -> index-of@(parent, child) != -1
else
  #(child, parent) as Boolean
    let len = ~+parent.length
    let mutable i = -1
    while (i ~+= 1) < len
      if child == parent[i] and parent haskey i
        return true
    false

macro for
  syntax reducer as (\every | \some | \first | \filter)?, value as Declarable, index as (",", value as Identifier, length as (",", this as Identifier)?)?, "in", array as Logic, body as (BodyNoEnd | (";", this as Statement)), else-body as ("\n", "else", this as (BodyNoEnd | (";", this as Statement)))?, "end"
    value := @macro-expand-1(value)
  
    let mutable length = null
    if index
      length := index.length
      index := index.value
    
    if @is-call(array) and @is-ident(@call-func(array)) and @name(@call-func(array)) == \__to-array and not @call-is-apply(array)
      array := @call-args(array)[0]
    
    if @is-call(array) and @is-ident(@call-func(array)) and @name(@call-func(array)) == \__range and not @call-is-apply(array)
      if @is-array(value) or @is-object(value)
        throw Error "Cannot assign a number to a complex declarable"
      value := value.ident
      let [mutable start, mutable end, mutable step, mutable inclusive] = @call-args(array)
    
      let init = []
    
      if @is-const(start)
        if not is-number! @value(start)
          throw Error "Cannot start with a non-number: #(@value start)"
      else
        start := ASTE +$start
      init.push @macro-expand-all AST let mutable $value = $start

      if @is-const(end)
        if not is-number! @value(end)
          throw Error "Cannot end with a non-number: #(@value start)"
      else if @is-complex(end)
        end := @cache (ASTE +$end), init, \end, false
      else
        init.push ASTE +$end

      if @is-const(step)
        if not is-number! @value(step)
          throw Error "Cannot step with a non-number: #(@value step)"
      else if @is-complex(step)
        step := @cache (ASTE +$step), init, \step, false
      else
        init.push ASTE +$step
    
      if @is-complex(inclusive)
        inclusive := @cache (ASTE $inclusive), init, \incl, false
    
      let test = if @is-const(step)
        if @value(step) > 0
          if @is-const(end) and @value(end) == Infinity
            ASTE true
          else
            ASTE if $inclusive then $value ~<= $end else $value ~< $end
        else
          if @is-const(end) and @value(end) == -Infinity
            ASTE true
          else
            ASTE if $inclusive then $value ~>= $end else $value ~> $end
      else
        ASTE if $step ~> 0
          if $inclusive then $value ~<= $end else $value ~< $end
        else
          if $inclusive then $value ~>= $end else $value ~> $end
    
      let mutable increment = ASTE $value ~+= $step
    
      if length
        init.push @macro-expand-all AST let $length = if $inclusive
          ($end ~- $start ~+ $step) ~\ $step
        else
          ($end ~- $start) ~\ $step
    
      if index
        init.push @macro-expand-all AST let mutable $index = 0
        increment := AST
          $increment
          $index += 1
        if @has-func(body)
          let func = @tmp \f, false, \function
          init.push (AST let $func = #($value, $index) -> $body)
          body := (ASTE $func@(this, $value, $index))
      else if @has-func(body)
        let func = @tmp \f, false, \function
        init.push (AST let $func = #($value) -> $body)
        body := (ASTE $func@(this, $value))
    
      if reducer == \every
        ASTE for every $init; $test; $increment
          $body
        else
          $else-body
      else if reducer == \some
        ASTE for some $init; $test; $increment
          $body
        else
          $else-body
      else if reducer == \first
        ASTE for first $init; $test; $increment
          $body
        else
          $else-body
      else if reducer == \filter
        body := @mutate-last body, #(node)
          AST if $node
            $value
        ASTE for $init; $test; $increment
          $body
        else
          $else-body
      else if @position == "expression"
        ASTE for $init; $test; $increment
          $body
        else
          $else-body
      else
        AST
          for $init; $test; $increment
            $body
          else
            $else-body
    else
      let init = []
      let is-string = @is-type array, \string
  
      let has-index = index?
      index ?= @tmp \i, false, \number
      let mutable has-length = length?
      length ?= @tmp \len, false, \number
    
      @macro-expand-all AST let $length = 0
      
      array := @macro-expand-all(array)
      
      let mutable step = ASTE 1
      let mutable start = ASTE 0
      let mutable end = ASTE Infinity
      let mutable inclusive = ASTE false
      if @is-call(array) and @is-ident(@call-func(array))
        if @name(@call-func(array)) == \__step and not @call-is-apply(array)
          let args = @call-args(array)
          array := args[0]
          step := args[1]
          if @is-const(step)
            if @value(step) >= 0
              start := ASTE 0
              end := ASTE Infinity
            else
              start := ASTE Infinity
              end := ASTE 0
          else
            start := void
            end := void
          inclusive := ASTE true
        else if @name(@call-func(array)) == \__slice and @call-is-apply(array)
          let args = @call-args(array)
          array := args[0]
          start := args[1]
          end := args[2]
          if @is-const(end) and is-void! @value(end)
            end := ASTE Infinity
        else if @name(@call-func(array)) == \__slice-step and not @call-is-apply(array)
          let args = @call-args(array)
          array := args[0]
          start := args[1]
          end := args[2]
          step := args[3]
          inclusive := args[4]
      if @is-const(step)
        if not is-number! @value(step) or @value(step) not %% 1
          throw Error "Expected step to be an integer, got $(typeof! @value(step)) ($(String @value(step)))"
        else if @value(step) == 0
          throw Error "Step must be non-zero"
      if start and @is-const(start) and @value(start) != Infinity and (not is-number! @value(start) or @value(start) not %% 1)
        throw Error "Expected start to be an integer, got $(typeof! @value(start)) ($(String @value(start)))"
      if end and @is-const(end) and @value(end) != Infinity and (not is-number! @value(end) or @value(end) not %% 1)
        throw Error "Expected end to be an integer or Infinity, got $(typeof! @value(end)) ($(String @value(end)))"
      
      if not is-string and not @is-type array, \array-like
        array := ASTE __to-array $array
      array := @cache array, init, if is-string then \str else \arr, false
      
      let value-expr = ASTE if $is-string then $array.char-at($index) else $array[$index]
      let let-index = @macro-expand-all AST let mutable $index = 0
      let value-ident = if value and value.type == \ident and not value.is-mutable then value.ident else @tmp \v, false
      let let-value = @macro-expand-all AST let $value = $value-expr
      let let-length = @macro-expand-all AST let $length = +$array.length
      
      let [test, increment] = if @is-const(step)
        if @value(step) > 0
          if @is-const(start)
            if @value(start) >= 0
              init.push AST let mutable $index = $start
              init.push let-length
            else
              init.push let-length
              init.push AST let mutable $index = $length + $start
          else
            init.push let-length
            init.push AST let mutable $index = __int($start)
            init.push ASTE if $index ~< 0 then ($index += $length)
          if @is-const(end) and (@value(end) == Infinity or (@is-const(inclusive) and @value(inclusive) and @value(end) == -1))
            [ASTE $index ~< $length, ASTE ($index ~+= $step)]
          else
            let tmp = @tmp \end, false, \number
            init.push AST let mutable $tmp = +$end
            if not @is-const(end)
              init.push ASTE if $tmp ~< 0 then ($tmp ~+= $length)
            else if @value(end) < 0
              init.push ASTE $tmp ~+= $length
            init.push ASTE if $inclusive then ($tmp := $tmp + 1 or Infinity)
            init.push ASTE $tmp ~min= $length
            [ASTE $index ~< $tmp, ASTE $index ~+= $step]
        else if @value(step) == -1 and (not start or (@is-const(start) and @value(start) in [-1, Infinity] and @is-const(end) and @value(end) == 0 and @is-const(inclusive) and @value(inclusive)))
          if has-length
            init.push let-length
            init.push AST let mutable $index = $length
          else
            init.push AST let mutable $index = +$array.length
          [ASTE post-dec! $index, @noop()]
        else
          if not @is-const(end) or @value(end) < 0
            has-length := true
          if @is-const(start)
            if @value(start) in [-1, Infinity]
              if has-length
                init.push let-length
                init.push AST let mutable $index = $length ~- 1
              else
                init.push AST let mutable $index = +$array.length ~- 1
            else
              init.push let-length
              if @value(start) >= 0
                init.push AST let mutable $index = if $start ~< $length then $start else $length ~- 1
              else
                init.push AST let mutable $index = $length ~+ +$start
          else
            init.push let-length
            init.push AST let mutable $index = +$start
            init.push AST if $index ~< 0 then ($index ~+= $length) else ($index ~min= $length)
            init.push AST $index ~-= 1
          if @is-const(end)
            if @value(end) >= 0
              [ASTE if $inclusive then $index ~>= $end else $index ~> $end, ASTE $index ~+= $step]
            else
              [ASTE if $inclusive then $index ~>= $end + $length else $index ~> $end + $length, ASTE $index ~+= $step]
          else
            let tmp = @tmp \end, false, \number
            init.push AST let mutable $tmp = +$end
            init.push AST if $tmp ~< 0 then ($tmp ~+= $length)
            [ASTE if $inclusive then $index ~>= $tmp else $index ~> $tmp, ASTE $index ~+= $step]
      else
        if @is-complex(step)
          step := @cache (ASTE __int(__nonzero($step))), init, \step, false
        else
          init.unshift ASTE __int(__nonzero($step))
        init.push let-length
        if not start
          init.push AST let mutable $index = if $step ~> 0 then 0 else $length ~- 1
          [
            ASTE if $step ~> 0 then $index ~< $length else $index ~>= 0
            ASTE $index ~+= $step
          ]
        else
          if @is-const(start)
            if @value(start) == Infinity
              init.push AST let mutable $index = $length ~- 1
            else
              init.push AST let mutable $index = if $start ~>= 0 then $start else $start + $length
          else
            init.push AST let mutable $index = $start
            init.push AST if $index ~< 0 then ($index += $length) else if $step ~< 0 then ($index ~min= $length)
          let tmp = @tmp \end, false, \number
          if @is-const(end)
            init.push AST let mutable $tmp = if $end ~< 0 then $end ~+ $length else $end max (if $inclusive then $length ~- 1 else $length)
          else
            init.push AST let mutable $tmp = +$end
            init.push AST if $tmp ~< 0 then ($tmp += $length) else if $step ~> 0 then ($tmp ~min= if $inclusive then $length ~- 1 else $length) else ($tmp ~max= (if $inclusive then 0 else -1))
          end := tmp
          [
            ASTE if $step ~> 0
              if $inclusive then $index ~<= $end else $index ~< $end
            else
              if $inclusive then $index ~>= $end else $index ~< $end
            ASTE $index ~+= $step
          ]
    
      if @has-func(body)
        let func = @tmp \f, false, \function
        if value and value-ident != value.ident
          body := AST
            let $value = $value-ident
            $body
        if has-index
          init.push AST let $func = #($value-ident, $index) -> $body
          body := ASTE $func@(this, $value-expr, $index)
        else
          init.push AST let $func = #($value-ident) -> $body
          body := ASTE $func@(this, $value-expr)
      else if value-ident == value.ident or reducer != \filter
        body := AST
          let $value = $value-expr
          $body
      else
        body := AST
          let $value-ident = $value-expr
          let $value = $value-ident
          $body
  
      if reducer == \every
        ASTE for every $init; $test; $increment
          $body
        else
          $else-body
      else if reducer == \some
        ASTE for some $init; $test; $increment
          $body
        else
          $else-body
      else if reducer == \first
        ASTE for first $init; $test; $increment
          $body
        else
          $else-body
      else if reducer == \filter
        body := @mutate-last body, #(node)
          AST if $node
            $value-ident
        ASTE for $init; $test; $increment
          $body
        else
          $else-body
      else if @position == \expression
        ASTE for $init; $test; $increment
          $body
        else
          $else-body
      else
        AST
          for $init; $test; $increment
            $body
          else
            $else-body

  syntax "reduce", value as Declarable, index as (",", value as Identifier, length as (",", this as Identifier)?)?, "in", array as Logic, ",", current as Identifier, "=", current-start, body as (Body | (";", this as Statement))
    value := @macro-expand-1(value)
    body := @mutate-last body or @noop(), #(node) -> (ASTE $current := $node)
    let length = index?.length
    index := index?.value
    AST
      let mutable $current = $current-start
      for $value, $index, $length in $array
        $body
      $current

  syntax reducer as (\every | \some | \first)?, key as Identifier, value as (",", value as Declarable, index as (",", this as Identifier)?)?, type as ("of" | "ofall"), object as Logic, body as (BodyNoEnd | (";", this as Statement)), else-body as ("\n", "else", this as (BodyNoEnd | (";", this as Statement)))?, "end"
    let mutable index = null
    if value
      index := value.index
      value := @macro-expand-1(value.value)
    
    let own = type == "of"
    let init = []
    if own or value
      object := @cache object, init, \obj, false
  
    @let key, false, @type(\string)
    let let-value = value and @macro-expand-all AST let $value = $object[$key]
    let let-index = index and @macro-expand-all AST let mutable $index = -1
    if @has-func(body)
      let func = @tmp \f, false, \function
      let value-ident = if value then (if value.type == \ident then value.ident else @tmp \v, false)
      if value and value-ident != value.ident
        body := AST
          let $value = $value-ident
          $body
      if index
        init.push (AST let $func = #($key, $value-ident, $index) -> $body)
        body := (ASTE $func@(this, $key, $object[$key], $index))
      else if value
        init.push (AST let $func = #($key, $value-ident) -> $body)
        body := (ASTE $func@(this, $key, $object[$key]))
      else
        init.push (AST let $func = #($key) -> $body)
        body := (ASTE $func@(this, $key))
    else if value
      body := AST
        $let-value
        $body

    let post = []
    if else-body
      let run-else = @tmp \else, false, \boolean
      init.push (AST let $run-else = true)
      body := AST
        $run-else := false
        $body
      post.push AST
        if $run-else
          $else-body
  
    if index
      init.push let-index
      body := AST
        $index ~+= 1
        $body
  
    if own
      body := AST
        if $object ownskey $key
          $body
  
    if reducer
      if reducer == \first
        body := @mutate-last body or @noop(), #(node) -> (AST return $node)
        let loop = @for-in(key, object, body)
        AST do
          $init
          $loop
          $else-body
      else
        if else-body
          throw Error("Cannot use a for loop with an else with $reducer")
        if reducer == \some
          body := @mutate-last body or @noop(), #(node) -> AST
            if $node
              return true
          let loop = @for-in(key, object, body)
          AST do
            $init
            $loop
            false
        else if reducer == \every
          body := @mutate-last body or @noop(), #(node) -> AST
            if not $node
              return false
          let loop = @for-in(key, object, body)
          AST do
            $init
            $loop
            true
        else
          throw Error("Unknown reducer: $reducer")
    else if @position == \expression
      if else-body
        throw Error("Cannot use a for loop with an else as an expression")
      let arr = @tmp \arr, false, @type(body).array()
      body := @mutate-last body or @noop(), #(node) -> (ASTE $arr.push $node)
      init.unshift AST let $arr = []
      let loop = @for-in(key, object, body)
      AST
        $init
        $loop
        $arr
    else
      let loop = @for-in(key, object, body)
      AST
        $init
        $loop
        $post
  
  syntax "reduce", key as Identifier, value as (",", value as Declarable, index as (",", this as Identifier)?)?, type as ("of" | "ofall"), object as Logic, ",", current as Identifier, "=", current-start, body as (Body | (";", this as Statement))
    body := @mutate-last body or @noop(), #(node) -> (ASTE $current := $node)
    let index = value?.index
    value := value?.value
    let loop = if type == "of"
      AST for $key, $value, $index of $object
        $body
    else
      AST for $key, $value, $index ofall $object
        $body
    AST
      let mutable $current = $current-start
      $loop
      $current

define helper __generic-func = #(num-args as Number, make as ->)
  let cache = WeakMap()
  let any = {}
  let generic = #
    for reduce i in num-args - 1 to 0 by -1, current = cache
      let type = arguments[i] ? any
      let mutable item = current.get(type)
      if not item?
        item := if i == 0
          make@ this, ...arguments
        else
          WeakMap()
        current.set type, item
      item
  let result = generic()
  result.generic := generic
  result

define operator unary mutate-function! with type: \node, label: \mutate-function
  let article(text)
    if r"^[aeiou]"i.test(text)
      "an"
    else
      "a"
  let with-article(text) -> "$(article text) $text"
  let PRIMORDIAL_TYPES = {
    +Number
    +String
    +Boolean
    +Function
    +Array
    +Object
  }
  let translate-generic-type(type)@
    if not @is-type-generic(type)
      type
    else
      let basetype = @basetype(type)
      if @name(basetype) in [\Array, \Function]
        basetype
      else
        let type-arguments = @array (for subtype in @type-arguments(type); translate-generic-type subtype)
        ASTE $basetype.generic(...$type-arguments)
  let translate-type-check(value, value-name, type, has-default-value)@
    if @is-ident(type)
      let result = if PRIMORDIAL_TYPES ownskey @name(type)
        AST
          if $value not instanceof $type
            throw TypeError "Expected $($value-name) to be $($(with-article @name(type))), got $(typeof! $value)"
      else
        AST
          if $value not instanceof $type
            throw TypeError "Expected $($value-name) to be a $(__name $type), got $(typeof! $value)"
      if not has-default-value and @name(type) == \Boolean
        AST! if not $value?
          $value := false
        else
          $result
      else
        result
    else if @is-access(type)
      AST
        if $value not instanceof $type
          throw TypeError "Expected $($value-name) to be $($(with-article @value(@child(type)))), got $(typeof! $value)"
    else if @is-type-union(type)
      let mutable check = void
      let mutable has-boolean = false
      let mutable has-void = false
      let mutable has-null = false
      let names = []
      let tests = []
      for t in @types(type)
        if @is-const(t)
          if is-null! @value(t)
            has-null := true
            names.push @const \null
          else if is-void! @value(t)
            has-void := true
            names.push @const \undefined
          else
            throw Error "Unknown const value for typechecking: $(String @value(t))"
        else if @is-ident(t)
          if @name(t) == \Boolean
            has-boolean := true
          if PRIMORDIAL_TYPES ownskey @name(t)
            names.push @const(@name(t))
          else
            names.push ASTE __name $t
          tests.push ASTE $value not instanceof $t
        else
          throw Error "Not implemented: typechecking for non-idents/consts within a type-union"

      let test = if tests.length
        @binary-chain "&&", tests
      else
        ASTE true
      let type-names = for reduce name in names[1 til Infinity], current = names[0]
        ASTE "$($current) or $($name)"
      let mutable result = AST if $test
        throw TypeError "Expected $($value-name) to be one of $($type-names), got $(typeof! $value)"

      if not has-default-value
        if has-null or has-void
          if has-null xor has-void
            result := AST! if not $value?
              $value := if $has-null then null else void
            else
              $result
          else
            result := AST if $value?
              $result
        else if has-boolean
          result := AST! if not $value?
            $value := false
          else
            $result
      result
    else if @is-type-generic(type)
      if @name(@basetype(type)) == \Array
        let index = @tmp \i, false, \number
        let sub-check = translate-type-check (ASTE $value[$index]), (ASTE $value-name & "[" & $index & "]"), @type-arguments(type)[0], false
        AST if not is-array! $value
          throw TypeError "Expected $($value-name) to be an Array, got $(typeof! $value)"
        else
          for (let mutable $index = $value.length); post-dec! $index;
            $sub-check
      else if @name(@basetype(type)) == \Function
        translate-type-check(value, value-name, @basetype(type), has-default-value)
      else
        let generic-type = translate-generic-type(type)
        AST
          if $value not instanceof $generic-type
            throw TypeError "Expected $($value-name) to be a $(__name $generic-type), got $(typeof! $value)"
    else if @is-type-object(type)
      let checks = for {key, value: pair-value} in @pairs(type)
        translate-type-check (ASTE $value[$key]), (ASTE $value-name & "." & $key), pair-value, false
      AST if not is-object! $value
        throw TypeError "Expected $($value-name) to be an Object, got $(typeof! $value)"
      else
        $checks
    else
      throw Error "Unknown type to translate: $(typeof! type)"
  let init = []
  let mutable changed = false
  let translate-param(param, in-destructure)@
    if @is-array(param)
      changed := true
      let array-ident = @tmp \p, false, \array
      let mutable found-spread = -1
      let mutable spread-counter = void
      for element, i, len in @elements(param)
        let init-index = init.length
        let element-param = translate-param element, true
        if element-param?
          let element-ident = @param-ident(element-param)
          if not @param-is-spread(element-param)
            if found-spread == -1
              init.splice init-index, 0, AST let $element-ident = $array-ident[$i]
            else
              init.splice init-index, 0, AST let $element-ident = $array-ident[$spread-counter + ($i - $found-spread - 1)]
          else
            if found-spread != -1
              throw Error "Cannot have multiple spread parameters in an array destructure"
            found-spread := i
            if i == len - 1
              init.splice init-index, 0, AST let $element-ident = __slice@ $array-ident, ...(if $i == 0 then [] else [$i])
            else
              spread-counter := @tmp \i, false, \number
              init.splice init-index, 0, AST
                let mutable $spread-counter = $array-ident.length - ($len - $i - 1)
                let $element-ident = if $spread-counter > $i
                  __slice@ $array-ident, $i, $spread-counter
                else
                  $spread-counter := $i
                  []
      @rewrap @param(array-ident, null, false, false, null), param
    else if @is-object(param)
      changed := true
      let object-ident = @tmp \p, false, \object
      
      for pair in @pairs(param)
        let init-index = init.length
        let value = translate-param(pair.value, true)
        if value?
          let value-ident = @param-ident(value)
          let key = pair.key
          init.splice init-index, 0, AST let $value-ident = $object-ident[$key]
      
      @rewrap @param(object-ident, null, false, false, null), param
    else if @is-param(param)
      let default-value = @param-default-value(param)
      let as-type = @param-type(param)
      let param-ident = @param-ident(param)
      if default-value? or as-type? or not @is-ident-or-tmp(param-ident)
        changed := true
        let ident = if @is-ident-or-tmp(param-ident)
          param-ident
        else if @is-access(param-ident)
          @ident(@value(@child(param-ident)))
        else
          throw Error "Not an ident or this-access: $(typeof! param-ident)"
        let type-check = if as-type?
          translate-type-check(ident, @name(ident), as-type, default-value?)
        else
          @noop()
        init.push if default-value?
          AST!
            if not $ident?
              $ident := $default-value
            else
              $type-check
        else
          type-check
        if param-ident != ident
          init.push AST $param-ident := $ident
        @rewrap @param(ident, null, @param-is-spread(param), @param-is-mutable(param), null), param
      else
        param
    else if @is-nothing(param)
      changed := true
      if in-destructure
        null
      else
        let blank-ident = @tmp \p, false, \object
        @rewrap @param(blank-ident, null, false, false, null), param
    else
      throw Error "Unknown param type: $(typeof! param)"
  
  let mutable found-spread = -1
  let mutable spread-counter = void
  let params = []
  for param, i, len in @func-params(node)
    let init-index = init.length
    let p = translate-param(param, false)
    let ident = @param-ident(p)
    if @param-is-spread(p)
      if found-spread != -1
        throw Error "Cannot have two spread parameters"
      changed := true
      found-spread := i
      if i == len - 1
        init.splice init-index, 0, AST
          let $ident = __slice@ arguments, ...(if $i == 0 then [] else [$i])
      else
        spread-counter := @tmp \i, false, \number
        init.splice init-index, 0, AST
          let mutable $spread-counter = arguments.length - ($len - $i - 1)
          let $ident = if $spread-counter > $i
            __slice@ arguments, $i, $spread-counter
          else
            $spread-counter := $i
            []
    else
      if found-spread == -1
        params.push p
      else
        init.splice init-index, 0, AST
          let $ident = arguments[$spread-counter + ($i - $found-spread - 1)]
  
  let mutable result = if init.length or changed or @func-is-curried(node)
    let body = @func-body(node)
    @rewrap(@func(params
      AST
        $init
        $body
      @func-is-auto-return(node) and not @is-nothing(body)
      @func-is-bound(node)
      false
      @func-as-type(node)
      @func-is-generator(node)
      @func-generic(node)), node)
  else
    node
  
  if @func-is-curried(node)
    result := ASTE __curry $(params.length), $result
  
  let generic-args = @func-generic(node)
  if generic-args.length > 0
    let generic-cache = @tmp \cache, false, \object
    let generic-params = for generic-arg in generic-args; @param(generic-arg)
    let make-function-ident = @tmp \make, false, \function
    let instanceofs = {}
    for generic-arg in generic-args
      let name = @name(generic-arg)
      let key = @tmp "instanceof_$(name)", false, \function
      instanceofs[name] := {
        key
        let: AST let $key = __get-instanceof($generic-arg)
        used: false
      }
    result := @walk @macro-expand-all(result), #(node)@
      if @is-binary(node) and @op(node) == \instanceof
        let right = @right(node)
        if @is-ident(right)
          let name = @name(right)
          if instanceofs ownskey name
            let func = instanceofs[name].key
            instanceofs[name].used := true
            let left = @left(node)
            return ASTE $func($left)
    let instanceof-lets = for name, item of instanceofs
      if item.used
        item.let
    if instanceof-lets.length
      result := AST
        $instanceof-lets
        $result
    let make-function-func = @func(generic-params, result, true, false)
    result := AST __generic-func $(generic-args.length), $make-function-func
  result

define helper __range = #(start as Number, end as Number, step as Number, inclusive as Boolean) as [Number]
  if step == 0
    throw RangeError "step cannot be zero"
  else if not is-finite start
    throw RangeError "start must be finite"
  else if not is-finite end
    throw RangeError "end must be finite"
  let result = []
  let mutable i = start
  if step ~> 0
    while i ~< end, i ~+= step
      result.push i
    if inclusive and i ~<= end
      result.push i
  else
    while i ~> end, i ~+= step
      result.push i
    if inclusive and i ~>= end
      result.push i
  result

define helper __step = #(array, step as Number) as []
  if step == 0
    throw RangeError "step cannot be zero"
  else if step == 1
    __to-array(array)
  else if step == -1
    __slice@(array).reverse()
  else if step not %% 1
    throw RangeError "step must be an integer, got $(String step)"
  else
    let result = []
    if step > 0
      let mutable i = 0
      let len = +array.length
      while i < len, i += step
        result.push array[i]
    else
      let mutable i = array.length - 1
      while i >= 0, i += step
        result.push array[i]
    result

define helper __slice-step = #(array, start, end, mutable step, inclusive) as []
  let arr = if step ~< 0
    __slice@(array, if inclusive then end else end ~+ 1, start ~+ 1 or Infinity)
  else
    __slice@(array, start, if inclusive then end ~+ 1 or Infinity else end)
  if step == 1
    arr
  else if step == -1
    arr.reverse()
  else
    __step(arr, step)

define operator binary instanceofsome with precedence: 6, maximum: 1, invertible: true, type: \boolean
  if @is-array(right)
    let elements = @elements(right)
    if elements.length == 0
      if @is-complex(left)
        AST
          $left
          false
      else
        ASTE false
    else if elements.length == 1
      let element = elements[0]
      ASTE $left instanceof $element
    else
      let f(i, current, left)
        if i < elements.length
          let element = elements[i]
          f(i + 1, ASTE $current or $left instanceof $element, left)
        else
          current
      @maybe-cache left, #(set-left, left)
        let element = elements[0]
        f(1, ASTE $set-left instanceof $element, left)
  else
    ASTE __instanceofsome($left, $right)

macro try
  syntax try-body as (BodyNoEnd | (";", this as Statement)), typed-catches as ("\n", "catch", ident as Identifier, check as ((type as "as", value as Type)|(type as "==", value as Expression)), body as (BodyNoEnd | (";", this as Statement)))*, catch-part as ("\n", "catch", ident as Identifier, body as (BodyNoEnd | (";", this as Statement)))?, else-body as ("\n", "else", this as (BodyNoEnd | (";", this as Statement)))?, finally-body as ("\n", "finally", this as (BodyNoEnd | (";", this as Statement)))?, "end"
    let has-else = not not else-body
    if not catch-part and has-else and not finally-body
      throw Error("Must provide at least a catch, else, or finally to a try block")

    let mutable catch-ident = catch-part?.ident
    let mutable catch-body = catch-part?.body
    if typed-catches.length != 0
      if not catch-ident
        catch-ident := typed-catches[0].ident
      catch-body := for reduce type-catch in typed-catches by -1, current = catch-body or AST throw $catch-ident
        let type-ident = type-catch.ident
        let let-err = if @name(type-ident) != @name(catch-ident)
          AST let $type-ident = $catch-ident
        else
          @noop()
        if type-catch.check.type == "as"
          let types = @array for type in (if @is-type-union(type-catch.check.value) then @types(type-catch.check.value) else [type-catch.check.value])
            if @is-type-array(type)
              throw Error "Expected a normal type, cannot use an array type"
            else if @is-type-generic(type)
              throw Error "Expected a normal type, cannot use a generic type"
            else if @is-type-function(type)
              throw Error "Expected a normal type, cannot use a function type"
            else if @is-type-object(type)
              throw Error "Expected a normal type, cannot use an object type"
            type
          AST
            if $catch-ident instanceofsome $types
              $let-err
              $(type-catch.body)
            else
              $current
        else
          let value = type-catch.check.value
          AST
            if $catch-ident == $value
              $let-err
              $(type-catch.body)
            else
              $current
    let init = []
    let mutable run-else = void
    if has-else
      run-else := @tmp \else, false, \boolean
      init.push AST let $run-else = true
      if catch-body
        catch-body := AST
          $run-else := false
          $catch-body
      else
        catch-ident := @tmp \err
        catch-body := AST
          $run-else := false
          throw $catch-ident

    let mutable current = try-body
    if catch-body
      current := @try-catch(current, catch-ident, catch-body)
    if has-else
      current := @try-finally current, AST
        if $run-else
          $else-body
    if finally-body
      current := @try-finally(current, finally-body)

    AST
      $init
      $current

define helper StopIteration = if GLOBAL.StopIteration?
  GLOBAL.StopIteration
else
  __freeze {}

define helper __array-to-iter = do
  let proto = {
    iterator: #-> this
    next: #
      let i = @index + 1
      let array = @array
      if i >= array.length
        throw StopIteration
      @index := i
      array[i]
  }
  #(array as [])
    { extends proto
      array
      index: -1
    }

define helper __iter = #(iterable)
  if not iterable?
    throw TypeError "Expected iterable to be an Object, got $(typeof! iterable)"
  else if is-array! iterable
    __array-to-iter(iterable)
  else if is-function! iterable.iterator
    iterable.iterator()
  else if is-function! iterable.next
    iterable
  else
    throw Error "Expected iterable to be an Array or an Object with an 'iterator' function or an Object with a 'next' function, got $(typeof! iterable)"

macro for
  syntax reducer as (\every | \some | \first | \filter)?, value as Identifier, index as (",", this as Identifier)?, "from", iterable as Logic, body as (BodyNoEnd | (";", this as Statement)), else-body as ("\n", "else", this as (BodyNoEnd | (";", this as Statement)))?, "end"
    let init = []
    let iterator = @cache AST __iter($iterable), init, \iter, false
    let err = @tmp \e, true
    
    let step = []
    if index
      init.push AST let mutable $index = 0
      step.push ASTE $index ~+= 1
  
    let capture-value = AST try
      let $value = $iterator.next()
    catch $err
      if $err == StopIteration
        break
      else
        throw $err
  
    let post = []
    if else-body and not reducer and @position != \expression
      let run-else = @tmp \else, false, \boolean
      init.push (AST let $run-else = true)
      body := AST
        $run-else := false
        $body
      post.push AST
        if $run-else
          $else-body

    if @has-func(body)
      let func = @tmp \f, false, \function
      if not index
        init.push AST let $func = #($value) -> $body
        body := AST
          $capture-value
          $func@(this, $value)
      else
        init.push AST let $func = #($value, $index) -> $body
        body := AST
          $capture-value
          $func@(this, $value, $index)
    else
      body := AST
        $capture-value
        $body

    let main = if reducer == \every
      ASTE for every $init; true; $step
        $body
      else
        $else-body
    else if reducer == \some
      ASTE for some $init; true; $step
        $body
      else
        $else-body
    else if reducer == \first
      ASTE for first $init; true; $step
        $body
      else
        $else-body
    else if reducer == \filter
      body := @mutate-last body, #(node)
        AST if $node
          $value
      ASTE for $init; true; $step
        $body
      else
        $else-body
    else if @position == \expression
      ASTE for $init; true; $step
        $body
      else
        $else-body
    else
      AST
        for $init; true; $step
          $body
        $post
    
    AST try
      $main
    finally
      $iterator?.close?()

  syntax "reduce", value as Identifier, index as (",", this as Identifier)?, "from", iterator as Logic, ",", current as Identifier, "=", current-start, body as (Body | (";", this as Statement))
    body := @mutate-last body or @noop(), #(node) -> (ASTE $current := $node)
    AST
      let mutable $current = $current-start
      for $value, $index from $iterator
        $body
      $current

macro switch
  syntax node as Logic, cases as ("\n", "case", node-head as Logic, node-tail as (",", this as Logic)*, body as (BodyNoEnd | (";", this as Statement))?)*, default-case as ("\n", "default", this as (BodyNoEnd | (";", this as Statement))?)?, "end"
    let result-cases = []
    for case_ in cases
      let case-nodes = [case_.node-head].concat(case_.node-tail)
      let mutable body = case_.body
      let mutable is-fallthrough = false
      if @is-block(body)
        let nodes = @nodes(body)
        let last-node = nodes[* - 1]
        if @is-ident(last-node) and @name(last-node) == \fallthrough
          body := @block(nodes.slice(0, -1))
          is-fallthrough := true
      else if @is-ident(body) and @name(body) == \fallthrough
        body := @noop()
        is-fallthrough := true

      for case-node in case-nodes.slice(0, -1)
        result-cases.push
          node: case-node
          body: @noop()
          fallthrough: true
      result-cases.push
        node: case-nodes[* - 1]
        body: body
        fallthrough: is-fallthrough

    @switch(node, result-cases, default-case)
  
  syntax cases as ("\n", "case", test as Logic, body as (BodyNoEnd | (";", this as Statement))?)*, default-case as ("\n", "default", this as (BodyNoEnd | (";", this as Statement))?)?, "end"
    for reduce case_ in cases by -1, current = default-case
      let test = case_.test
      let mutable body = case_.body
      let mutable is-fallthrough = false
      let mutable result = void
      if @is-block(body)
        let nodes = @nodes(body)
        let last-node = nodes[* - 1]
        if @is-ident(last-node) and @name(last-node) == \fallthrough
          body := @block(nodes.slice(0, -1))
          result := if @is-if(current)
            let fall = @tmp \fall, false, \boolean
            AST
              let mutable $fall = false
              if $test
                $fall := true
                $body
              if $fall or $(@test(current))
                $(@when-true(current))
              else
                $(@when-false(current))
          else
            AST
              if $test
                $body
              $current
      else if @is-ident(body) and @name(body) == \fallthrough
        if @is-if(current)
          result := AST if $test or $(@test(current))
            $(@when-true(current))
          else
            $(@when-false(current))
        else
          result := AST
            $test
            $current
            
      result or AST if $(case_.test)
        $body
      else
        $current

define helper __keys = if is-function! Object.keys
  Object.keys
else
  #(x) as [String]
    let keys = []
    for key of x
      keys.push key
    keys

define operator unary keys!
  ASTE __keys($node)

define helper __allkeys = #(x) as [String]
  let keys = []
  for key ofall x
    keys.push key
  keys

define operator unary allkeys!
  ASTE __allkeys($node)

define helper __new = do
  let new-creators = []
  #(Ctor, args)
    let length = args.length
    let mutable creator = new-creators[length]
    if not creator
      let func = ["return new C("]
      for i in 0 til length
        if i > 0
          func.push ", "
        func.push "a[", i, "]"
      func.push ");"
      creator := Function("C", "a", func.join(""))
      new-creators[length] := creator
    creator(Ctor, args)

define helper __instanceofsome = #(value, array) as Boolean
  for some item in array by -1
    value instanceof item

define helper __get-instanceof = do
  let is-any = #-> true
  let is-str = (is-string!)
  let is-num = (is-number!)
  let is-func = (is-function!)
  let is-bool = (is-boolean!)
  #(ctor) as (-> Boolean)
    if not ctor?
      is-any
    else
      switch ctor
      case String; is-str
      case Number; is-num
      case Function; is-func
      case Boolean; is-bool
      case Array; __is-array
      case Object; __is-object
      default; (instanceof ctor)

define helper __name = #(func as ->) as String -> func.display-name or func.name or ""

define helper __once = do
  let replacement() -> throw Error "Attempted to call function more than once"
  let do-nothing() ->
  #(mutable func as ->, silent-fail as Boolean) -> #
    let f = func
    func := if silent-fail then do-nothing else replacement
    f@ this, ...arguments

macro once!(func, silent-fail)
  if @is-func(func)
    let body = @func-body func
    let ran = @tmp \once, true, \boolean
    func := @rewrap(@func(
      @func-params func
      AST
        if $ran
          if $silent-fail
            return
          else
            throw Error "Attempted to call function more than once"
        else
          $ran := true
        $body
      @func-is-auto-return func
      @func-is-bound func
      @func-is-curried func
      @func-as-type func
      @func-is-generator func
      @func-generic func))
    AST
      let mutable $ran = false
      $func
  else
    if @is-const(silent-fail) and not @value(silent-fail)
      ASTE __once $func
    else
      ASTE __once $func, $silent-fail

macro async
  syntax params as (head as Parameter, tail as (",", this as Parameter)*)?, "<-", call as Expression, body as DedentedBody
    if not @is-call(call)
      throw Error("async call expression must be a call")
    
    body ?= @noop()
    
    params := if params then [params.head].concat(params.tail) else []
    let func = @func(params, body, true, true)
    @call @call-func(call), @call-args(call).concat([ASTE once! (mutate-function! $func)]), @call-is-new(call), @call-is-apply(call)

macro async!
  syntax callback as ("throw" | Expression), params as (",", this as Parameter)*, "<-", call as Expression, body as DedentedBody
    if not @is-call(call)
      throw Error("async! call expression must be a call")
    
    body ?= @noop()
    
    let error = @tmp \e, false
    params := [@param(error)].concat(params)
    let func = @func params,
      if callback == "throw"
        AST
          throw? $error
          $body
      else
        AST
          if $error?
            return $callback $error
          $body
      true
      true
    @call @call-func(call), @call-args(call).concat([ASTE once! (mutate-function! $func)]), @call-is-new(call), @call-is-apply(call)

macro require!
  syntax name as Expression
    if @is-const name
      if not is-string! @value(name)
        throw Error("Expected a constant string, got $(typeof! @value(name))")
    
    if @is-const name
      let mutable ident-name = @value(name)
      if ident-name.index-of("/") != -1
        ident-name := ident-name.substring ident-name.last-index-of("/") + 1
      let ident = @ident ident-name
      AST let $ident = require $name
    else if @is-ident name
      let path = @name name
      AST let $name = require $path
    else if @is-object name
      let requires = []
      for obj in @pairs(name)
        let {key, value} = obj
        unless @is-const key
          throw Error "If providing an object to require!, all keys must be constant strings"
        let mutable ident-name = @value(key)
        if ident-name.index-of("/") != -1
          ident-name := ident-name.substring ident-name.last-index-of("/") + 1
        let ident = @ident ident-name
        if @is-const value
          requires.push AST let $ident = require $value
        else if @is-ident value
          let path = @name value
          requires.push AST let $ident = require $path
        else
          throw Error "If providing an object to require!, all values must be constant strings or idents"
      @block(requires)
    else
      throw Error("Expected either a constant string or ident or object")

define helper __async = #(mutable limit as Number, length as Number, has-result as Boolean, on-value as ->, on-complete as ->)!
  let result = if has-result then [] else null
  if length ~<= 0
    return on-complete null, result
  if limit ~< 1 or limit != limit
    limit := Infinity

  let mutable broken = null
  let mutable slots-used = 0
  let mutable sync = false
  let mutable completed = false
  let on-value-callback(err, value)!
    if completed
      return
    slots-used ~-= 1
    if err? and not broken?
      broken := err
    if has-result and not broken? and arguments.length ~> 1
      result.push value
    if not sync
      next()
  let mutable index = -1
  let next()!
    while not completed and not broken? and slots-used ~< limit and (index += 1) ~< length
      slots-used ~+= 1
      sync := true
      on-value index, once!(on-value-callback)
      sync := false
    if not completed and (broken? or slots-used == 0)
      completed := true
      if broken?
        on-complete(broken)
      else
        on-complete(null, result)
  next()

define helper __async-iter = #(mutable limit as Number, iterator as {next: Function}, has-result as Boolean, on-value as ->, on-complete as ->)!
  if limit ~< 1 or limit != limit
    limit := Infinity
  let mutable broken = null
  let mutable slots-used = 0
  let mutable sync = false
  let result = if has-result then [] else null
  let mutable completed = false
  let on-value-callback(err, value)!
    if completed
      return
    slots-used ~-= 1
    if err? and not broken?
      broken := err
    if has-result and not broken? and arguments.length ~> 1
      result.push value
    if not sync
      next()
  let mutable index = -1
  let mutable iter-stopped = false
  let mutable close = #
    close := null
    iterator?.close?()
  let next()!
    while not completed and not broken? and slots-used ~< limit and not iter-stopped
      try
        let value = iterator.next()
      catch e == StopIteration
        iter-stopped := true
        break
      catch e
        broken := e
        break
      slots-used ~+= 1
      sync := true
      try
        on-value value, (index += 1), once!(on-value-callback)
      catch e
        if close
          close()
        throw e
      sync := false
    if not completed and (broken? or slots-used == 0)
      completed := true
      if close
        close()
      if broken?
        on-complete(broken)
      else
        on-complete(null, result)
  next()

macro asyncfor
  syntax results as (err as Identifier, result as (",", this as Identifier)?, "<-")?, next as Identifier, ",", init as (Statement|""), ";", test as (Logic|""), ";", step as (Statement|""), body as (BodyNoEnd | (";", this as Statement)), "end", rest as DedentedBody
    let {mutable err, result} = results ? {}
    err ?= @tmp \err, true
    init ?= @noop()
    test ?= ASTE true
    step ?= @noop()
    rest ?= @noop()
    let done = @tmp \done, true, \function
    if not result
      if not step
        AST
          $init
          let $next($err)@
            if $err?
              return $done($err)
            unless $test
              return $done(null)
            $body
          let $done($err)@
            $rest
          $next()
      else
        let first = @tmp \first, true, \boolean
        AST
          $init
          let $first = true
          let $next($err)@
            if $err?
              return $done($err)
            if $first
              $first := false
            else
              $step
            unless $test
              return $done(null)
            $body
          let $done($err)@
            $rest
          $next()
    else
      let first = @tmp \first, true, \boolean
      let value = @tmp \value, true
      let arr = @tmp \arr, true
      AST
        $init
        let $first = true
        let $arr = []
        let $next($err, $value)@
          if $err?
            return $done($err)
          if $first
            $first := false
          else
            $step
            if arguments.length ~> 1
              $arr.push $value
          unless $test
            return $done(null, $arr)
          $body
        let $done($err, $result)@
          $rest
        $next()
  
  syntax parallelism as ("(", this as Expression, ")")?, results as (err as Identifier, result as (",", this as Identifier)?, "<-")?, next as Identifier, ",", value as Declarable, index as (",", value as Identifier, length as (",", this as Identifier)?)?, "in", array, body as (BodyNoEnd | (";", this as Statement)), "end", rest as DedentedBody
    let {mutable err, result} = results ? {}
    let has-result = not not result
    err ?= @tmp \err, true
    let init = []
    
    rest ?= @noop()
    
    value := @macro-expand-1(value)
    let mutable length = null
    if index
      length := index.length
      index := index.value
    
    parallelism ?= ASTE 1
    
    index ?= @tmp \i, true, \number
    if @is-call(array) and @is-ident(@call-func(array)) and @name(@call-func(array)) == \__range and not @call-is-apply(array)
      if @is-array(value) or @is-object(value)
        throw Error "Cannot assign a number to a complex declarable"
      value := value.ident
      let [mutable start, mutable end, mutable step, mutable inclusive] = @call-args(array)
      
      if @is-const(start)
        if not is-number! @value(start)
          throw Error "Cannot start with a non-number: #(@value start)"
      else
        start := ASTE +$start

      if @is-const(end)
        if not is-number! @value(end)
          throw Error "Cannot end with a non-number: #(@value start)"
      else if @is-complex(end)
        end := @cache (ASTE +$end), init, \end, false
      else
        init.push ASTE +$end

      if @is-const(step)
        if not is-number! @value(step)
          throw Error "Cannot step with a non-number: #(@value step)"
      else if @is-complex(step)
        step := @cache (ASTE +$step), init, \step, false
      else
        init.push ASTE +$step
      
      body := AST
        let $value = $index ~* $step ~+ $start
        $body

      let length-calc = ASTE if $inclusive
        ($end ~- $start ~+ $step) ~\ $step
      else
        ($end ~- $start) ~\ $step
      if not length
        length := length-calc
      else
        init.push AST let $length = $length-calc
    else
      array := @cache array, init, \arr, true

      body := AST
        let $value = $array[$index]
        $body
      
      if not length
        length := ASTE +$array.length
      else
        init.push AST let $length = +$array.length
    
    AST
      $init
      __async +$parallelism, $length, $has-result,
        #($index, $next)@ -> $body
        if $has-result
          #($err, $result)@ -> $rest 
        else
          #($err)@ -> $rest
  
  syntax parallelism as ("(", this as Expression, ")")?, results as (err as Identifier, result as (",", this as Identifier)?, "<-")?, next as Identifier, ",", key as Identifier, value as (",", value as Declarable, index as (",", this as Identifier)?)?, type as ("of" | "ofall"), object, body as (BodyNoEnd | (";", this as Statement)), "end", rest as DedentedBody
    let {err, result} = results ? {}
    let own = type == "of"
    let init = []
    object := @cache object, init, \obj, true
    
    rest ?= @noop()
    
    let mutable index = null
    if value
      index := value.index
      value := @macro-expand-1(value.value)
    if value
      body := AST
        let $value = $object[$key]
        $body
    
    let keys = @tmp \keys, true, \string-array
    AST
      $init
      let $keys = if $own
        __keys $object
      else
        __allkeys $object
      asyncfor($parallelism) $err, $result <- $next, $key, $index in $keys
        $body
      $rest
  
  syntax parallelism as ("(", this as Expression, ")")?, results as (err as Identifier, result as (",", this as Identifier)?, "<-")?, next as Identifier, ",", value as Identifier, index as (",", this as Identifier)?, "from", iterator, body as (BodyNoEnd | (";", this as Statement)), "end", rest as DedentedBody
    let {mutable err, result} = results ? {}
    let has-result = not not result
    
    rest ?= @noop()
    
    index ?= @tmp \i, true
    err ?= @tmp \err, true
    parallelism ?= ASTE 1
    
    ASTE __async-iter +$parallelism, $iterator, $has-result,
      #($value, $index, $next)@ -> $body
      if $has-result
        #($err, $result)@ -> $rest
      else
        #($err)@ -> $rest

macro asyncwhile, asyncuntil
  syntax results as (err as Identifier, result as (",", this as Identifier)?, "<-")?, next as Identifier, ",", test as Logic, step as (",", this as Statement)?, body as (BodyNoEnd | (";", this as Statement)), "end", rest as DedentedBody
    if macro-name == \asyncuntil
      test := ASTE not $test
    
    rest ?= @noop()
    
    let {err, result} = results ? {}
    AST
      asyncfor $err, $result <- $next, ; $test; $step
        $body
      $rest

macro asyncif, asyncunless
  syntax results as (err as Identifier, result as (",", this as Identifier)?, "<-")?, done as Identifier, ",", test as Logic, body as (BodyNoEnd | (";", this as Statement)), else-ifs as ("\n", "else", type as ("if" | "unless"), test as Logic, body as (BodyNoEnd | (";", this as Statement)))*, else-body as ("\n", "else", this as (BodyNoEnd | (";", this as Statement)))?, "end", rest as DedentedBody
    if macro-name == \asyncunless
      test := ASTE not $test
    let {mutable err, result} = results ? {}
    
    let f = @tmp \f, false
    
    rest ?= @noop()
    
    let mutable current = if else-body
      ASTE $f := #($done)@ -> $else-body
    else
      ASTE $f := #($done)@ -> $done()
    
    let mutable i = else-ifs.length - 1
    while i >= 0, i -= 1
      let else-if = else-ifs[i]
      let mutable inner-test = else-if.test
      if else-if.type == "unless"
        inner-test := ASTE not $inner-test
      current := AST if $inner-test
        $f := #($done)@ -> $(else-if.body)
      else
        $current
    
    current := AST if $test
      $f := #($done)@ -> $body
    else
      $current
    
    if not err and not result
      AST
        $current
        $f(#@-> $rest)
    else if not result
      AST
        $current
        $f(#($err)@ -> $rest)
    else
      err ?= @tmp \err, true
      AST
        $current
        $f(#($err, $result)@ -> $rest)

macro def
  syntax key as ObjectKey, func as FunctionDeclaration
    @def key, func
  
  syntax key as ObjectKey, "=", value as ExpressionOrAssignment
    @def key, value
  
  syntax key as ObjectKey
    @def key, void

macro class
  syntax name as SimpleAssignable?, generic as ("<", head as Identifier, tail as (",", this as Identifier)*, ">")?, superclass as ("extends", this)?, body as Body?
    let mutable declaration = void
    let mutable assignment = void
    let generic-args = if generic? then [generic.head, ...generic.tail] else []
    if @is-ident(name)
      declaration := name
    else if @is-access(name)
      assignment := name
      if @is-const(@child(name)) and is-string! @value(@child(name))
        name := @ident(@value(@child(name))) ? @tmp \class, false, \function
      else
        name := @tmp \class, false, \function
    else
      name := @tmp \class, false, \function
    
    let has-superclass = not not superclass
    let sup = superclass and if @is-ident(superclass) then superclass else @tmp \super, false, \function
    let init = []
    let superproto = if not superclass
      ASTE Object.prototype
    else
      @tmp (if @is-ident(sup) then @name(sup) & \_prototype else \super_prototype), false, \object
    let prototype = @tmp (if @is-ident(name) then @name(name) & \_prototype else \prototype), false, \object
    if superclass
      init.push AST let $superproto = $sup.prototype
      init.push AST let $prototype = $name.prototype := { extends $superproto }
      init.push ASTE $prototype.constructor := $name
    else
      init.push AST let $prototype = $name.prototype
    
    let mutable display-name = if @is-ident(name) then @const(@name(name))
    if display-name?
      if generic-args.length > 0
        let parts = [display-name, @const("<")]
        for generic-arg, i in generic-args
          if i > 0
            parts.push @const(", ")
          parts.push ASTE if $generic-arg !~= null then __name $generic-arg else ""
        parts.push @const(">")
        display-name := @binary-chain "+", parts
      init.push ASTE $name.display-name := $display-name
    
    if superclass
      init.push AST $sup.extended?($name)
    
    let fix-supers(node)@ -> @walk node, #(node)@
      if @is-super(node)
        let mutable child = @super-child(node)
        if child?
          child := fix-supers child
        let args = for super-arg in @super-args node
          fix-supers super-arg
        
        @call(
          if child?
            ASTE $superproto[$child]
          else if not superclass
            ASTE Object
          else
            ASTE $sup
          [ASTE this].concat(args)
          false
          true)
    body := fix-supers @macro-expand-all(body)
    
    let mutable constructor-count = 0
    @walk body, #(node)@
      if @is-def(node)
        let key = @left(node)
        if @is-const(key) and @value(key) == \constructor
          //if @is-func(@right(node)) and @func-is-curried(@right(node))
          //  throw Error "Cannot curry a class's constructor"
          constructor-count += 1
      void
    
    let mutable has-top-level-constructor = false
    if constructor-count == 1
      @walk body, #(node)@
        if @is-def(node)
          let key = @left(node)
          if @is-const(key) and @value(key) == \constructor and @is-func(@right(node)) and not @func-is-curried(@right(node))
            has-top-level-constructor := true
          node
        else
          node
          
    let self = @tmp \this
    if has-top-level-constructor
      body := @walk body, #(node)@
        if @is-def(node)
          let key = @left(node)
          if @is-const(key) and @value(key) == \constructor
            let value = @right(node)
            let constructor = @rewrap(@func(
              @func-params value
              @func-body value
              false
              AST if eval("this") instanceof $name then eval("this") else { extends $prototype }), value)
            init.unshift AST let $name = $constructor
            @noop()
        else
          node
    else if constructor-count != 0
      let ctor = @tmp \ctor, false, \function
      let result = @tmp \ref
      init.push AST
        let mutable $ctor = void
        let $name()
          let $self = if this instanceof $name then this else { extends $prototype }
          
          if is-function! $ctor
            let $result = $ctor@ $self, ...arguments
            if Object($result) == $result
              return $result
          else if $has-superclass
            let $result = $sup@ $self, ...arguments
            if Object($result) == $result
              return $result
          $self
      body := @walk body, #(node)@
        if @is-def(node)
          let key = @left(node)
          if @is-const(key) and @value(key) == \constructor
            let value = @right(node)
            if @is-call(value) and @is-ident(@call-func(value)) and @name(@call-func(value)) == \__curry and @call-args(value).length == 2 and @is-func(@call-args(value)[1])
              let first-arg = @call-args(value)[0]
              let mutable constructor = @call-args(value)[1]
              constructor := @rewrap(@func(
                @func-params constructor
                @func-body constructor
                false
                AST if eval("this") instanceof $name then eval("this") else { extends $prototype }
                false), value)
              ASTE $ctor := __curry $first-arg, $constructor
            else if @is-func value
              let constructor = @rewrap(@func(
                @func-params value
                @func-body value
                false
                AST if eval("this") instanceof $name then eval("this") else { extends $prototype }
                @func-is-curried value), value)
              ASTE $ctor := $constructor
            else
              ASTE $ctor := $value
    else
      if not superclass
        init.push AST
          let $name() -> if this instanceof $name then this else { extends $prototype }
      else
        let result = @tmp \ref
        init.push AST
          let $name()
            let $self = if this instanceof $name then this else { extends $prototype }
            let $result = $sup@ $self, ...arguments
            if Object($result) == $result
              $result
            else
              $self
    
    let change-defs(node)@ -> @walk node, #(node)@
      if @is-def(node)
        let key = @left(node)
        let value = @right(node) ? ASTE #-> throw Error "Not implemented: $(__name @constructor).$($key)()"
        change-defs ASTE $prototype[$key] := $value
    body := change-defs body
    
    body := @walk body, #(node)@
      if @is-func(node)
        unless @func-is-bound(node)
          node
      else if @is-this(node)
        name
    
    let mutable result = AST do $sup = $superclass
      $init
      $body
      return $name
    
    if generic-args.length > 0
      let generic-cache = @tmp \cache, false, \object
      let generic-params = for generic-arg in generic-args; @param(generic-arg)
      let make-class-ident = @tmp \make, false, \function
      let instanceofs = {}
      for generic-arg in generic-args
        let name = @name(generic-arg)
        let key = @tmp "instanceof_$(name)", false, \function
        instanceofs[name] := {
          key
          let: AST let $key = __get-instanceof($generic-arg)
          used: false
        }
      result := @walk @macro-expand-all(result), #(node)@
        if @is-binary(node) and @op(node) == \instanceof
          let right = @right(node)
          if @is-ident(right)
            let name = @name(right)
            if instanceofs ownskey name
              let func = instanceofs[name].key
              instanceofs[name].used := true
              let left = @left(node)
              return ASTE $func($left)
      let instanceof-lets = for name, item of instanceofs
        if item.used
          item.let
      if instanceof-lets.length
        result := AST
          $instanceof-lets
          $result
      let make-class-func = @func(generic-params, result, true, false)
      result := AST __generic-func $(generic-args.length), $make-class-func
    
    if declaration?
      AST let $declaration = $result
    else if assignment?
      ASTE $assignment := $result
    else
      result

macro enum
  syntax name as SimpleAssignable?, body as Body?
    let mutable declaration = void
    let mutable assignment = void
    if @is-ident(name)
      declaration := name
    else if @is-access(name)
      assignment := name
      if @is-const(@child(name)) and is-string! @value(@child(name))
        name := @ident(@value(@child(name))) ? @tmp \enum, false, \object
      else
        name := @tmp \enum, false, \object
    else
      name := @tmp \enum, false, \object
    
    let mutable index = 0
    body := @walk @macro-expand-all(body), #(node)@
      if @is-def node
        let key = @left node
        let mutable value = @right node
        if not @is-const key
          throw Error "Cannot have non-const enum keys"
        if not value
          index += 1
          value := index
        ASTE this[$key] := $value
      else
        node
    
    let result = ASTE with {}
      $body
      return this
    
    if declaration?
      AST let $declaration = $result
    else if assignment?
      ASTE $assignment := $result
    else
      result

macro namespace
  syntax name as SimpleAssignable?, superobject as ("extends", this)?, body as Body?
    let mutable declaration = void
    let mutable assignment = void
    if @is-ident(name)
      declaration := name
    else if @is-access(name)
      assignment := name
      if @is-const(@child(name)) and is-string! @value(@child(name))
        name := @ident(@value(@child(name))) ? @tmp \ns, false, \object
      else
        name := @tmp \ns, false, \object
    else
      name := @tmp \ns, false, \object
    
    let sup = superobject and if @is-ident(superobject) then superobject else @tmp \super, false, \object
    let init = []
    if not superobject
      init.push AST let $name = {}
    else
      init.push AST let $name = { extends $sup }
    
    let fix-supers(node)@ -> @walk node, #(node)@
      if @is-super(node)
        let mutable child = @super-child(node)
        if child?
          child := fix-supers child
        let args = for super-arg in @super-args node
          fix-supers super-arg
        let parent = if not superobject
          ASTE Object.prototype
        else
          ASTE $sup
        @call(
          if child?
            ASTE $parent[$child]
          else
            ASTE $parent
          [ASTE this].concat(args)
          false
          true)
    body := fix-supers @macro-expand-all(body)
    
    let change-defs(node)@ -> @walk node, #(node)@
      if @is-def(node)
        let key = @left(node)
        let value = @right(node)
        change-defs ASTE $name[$key] := $value
    body := change-defs body
    
    body := @walk body, #(node)@
      if @is-func(node)
        unless @func-is-bound(node)
          node
      else if @is-this(node)
        name
    
    let mutable result = AST do $sup = $superobject
      $init
      $body
      return $name
    
    if declaration?
      AST let $declaration = $result
    else if assignment?
      ASTE $assignment := $result
    else
      result

macro yield
  syntax node as Expression
    if not @in-generator
      throw Error "Can only use yield in a generator function"
    if @position == \expression and false
      throw Error "yield can only be used in a statement position"
    @mutate-last node or @noop(), (#(n)@ -> @yield n), true

macro yield*
  syntax node as Expression
    if not @in-generator
      throw Error "Can only use yield* in a generator function"
    if @position == \expression
      throw Error "yield* can only be used in a statement position"
    let init = []
    if @is-type node, \array-like
      let index = @tmp \i, false, \number
      init.push AST let $index = 0
      let length = @tmp \len, false, \number
      node := @cache node, init, \arr, false
      init.push AST let $length = $node.length
      let yield-item = @yield ASTE $node[$index]
      AST
        for $init; $index ~< $length; $index += 1
          $yield-item
    else
      let iterator = @cache ASTE __iter($node), init, \iter, false
      let err = @tmp \e, true
      let send = @tmp \send
      let next = @tmp \next
      let yield-next = @yield next
      let received = @tmp \tmp
      AST
        $init
        let mutable $received = void
        let mutable $send = true
        try
          while true
            let $next = if $send then $iterator.send($received) else $iterator.throw $received
            try
              $received := $yield-next
              $send := true
            catch $err
              $received := $err
              $send := false
        catch $err
          if $err != StopIteration
            throw $err
        finally
          $iterator?.close?()

macro returning
  syntax node as Expression, rest as DedentedBody
    rest ?= @noop()
    AST
      $rest
      return $node

define helper __is = if is-function! Object.is
  Object.is
else
  #(x, y) as Boolean
    if x == y
      x != 0 or (1 ~/ x == 1 ~/ y)
    else
      x != x and y != y

define operator binary is with precedence: 2, maximum: 1, type: \boolean
  if @has-type(left, \number) and @has-type(right, \number)
    if @is-const(left)
      if @is-const(right)
        let result = __is(@value(left), @value(right))
        ASTE $result
      else
        if is-number! @value(left) and isNaN @value(left)
          @maybe-cache right, #(set-right, right)@
            ASTE $set-right != $right
        else if @value(left) == 0
          @maybe-cache right, #(set-right, right)@
            if 1 / @value(left) < 0
              ASTE $set-right == 0 and 1 ~/ $right < 0
            else
              ASTE $set-right == 0 and 1 ~/ $right > 0
        else
          ASTE $left == $right
    else if @is-const(right)
      if is-number! @value(right) and isNaN @value(right)
        @maybe-cache left, #(set-left, left)@
          ASTE $set-left != $left
      else if @value(right) == 0
        @maybe-cache left, #(set-left, left)@
          if 1 / @value(right) < 0
            ASTE $set-left == 0 and 1 ~/ $left < 0
          else
            ASTE $set-left == 0 and 1 ~/ $left > 0
      else
        ASTE $left == $right
    else
      ASTE __is $left, $right
  else
    ASTE $left == $right

define operator binary isnt with precedence: 2, maximum: 1, type: \boolean
  ASTE not ($left is $right)

define helper __bind = #(parent, child) as Function
  if not parent?
    throw TypeError "Expected parent to be an object, got $(typeof! parent)"
  let func = parent[child]
  if not is-function! func
    throw Error "Trying to bind child '$(String child)' which is not a function"
  # -> func@ parent, ...arguments

define helper __def-prop = do
  let fallback = Object.define-property
  if is-function! fallback and (do
      try
        let o = {}
        fallback(o, \sentinel, {})
        o haskey \sentinel
      catch e
        false)
    fallback
  else
    let supports-accessors = Object.prototype ownskey \__define-getter__
    let lookup-getter = supports-accessors and Object::__lookup-getter__
    let lookup-setter = supports-accessors and Object::__lookup-setter__
    let define-getter = supports-accessors and Object::__define-getter__
    let define-setter = supports-accessors and Object::__define-setter__
    #(object as {}|->, property as String, descriptor as {})
      if is-function! fallback
        try
          return fallback object, property, descriptor
        catch e
          void
      
      if descriptor ownskey \value
        if supports-accessors and (lookup-getter@ object, property or lookup-setter@ object, property)
          let proto = object.__proto__
          object.__proto__ := Object.prototype
          delete object[property]
          object[property] := descriptor.value
          object.__proto__ := proto
        else
          object[property] := descriptor.value
      else
        if not supports-accessors
          throw Error "Getters and setters cannot be defined on this Javascript engine"
        if descriptor ownskey \get
          define-getter@ object, property, descriptor.get
        if descriptor ownskey \set
          define-setter@ object, property, descriptor.set
      object

macro label!
  syntax label as Identifier, node as (Statement|Body)
    @with-label node, label

define helper __compose = #(left as ->, right as ->) as (->)
  #-> left@(this, right@(this, ...arguments))

define operator binary << with precedence: 13, type: \function
  ASTE __compose $left, $right

define operator binary >> with precedence: 13, type: \function, right-to-left: true
  if not @is-noop(left) and not @is-noop(right)
    let tmp = @tmp \ref
    AST
      let $tmp = $left
      __compose $right, $tmp
  else
    ASTE __compose $right, $left

define helper __curry = #(num-args as Number, f as ->) as (->)
  if num-args > 1
    let currier(args)
      if args.length >= num-args
        f.apply this, args
      else
        let ret()
          if arguments.length == 0
            ret
          else
            currier@ this, args.concat(__slice@(arguments))
        ret
    currier []
  else
    f

define operator binary <| with precedence: 0, right-to-left: true
  ASTE $left($right)

define operator binary |> with precedence: 0
  if not @is-noop(left) and not @is-noop(right)
    let tmp = @tmp \ref
    AST
      let $tmp = $left
      $right($tmp)
  else
    ASTE $right($left)

define helper __import = #(dest, source) as {}
  for k of source
    dest[k] := source[k]
  dest

define operator binary <<< with precedence: 6
  if @is-object(right)
    @maybe-cache left, #(set-left, next-left)@
      let mutable current-left = set-left
      let block = []
      let pairs = @pairs(right)
      for {key, value, property}, i, len in pairs
        if property?
          if property in [\get, \set] and i < len - 1 and pairs[i + 1].property? and @eq(key, pairs[i + 1].key) and pairs[i + 1].property != property and pairs[i + 1].property in [\get, \set]
            continue
          
          if property == \property
            block.push AST __def-prop $current-left, $key, $value
          else if property in [\get, \set]
            let descriptor = if i > 0 and pairs[i - 1].property? and @eq(key, pairs[i - 1].key) and pairs[i - 1].property != property and pairs[i - 1].property in [\get, \set]
              ASTE {
                [$(pairs[i - 1].property)]: $(pairs[i - 1].value)
                [$property]: $value
                enumerable: true
                configurable: true
              }
            else
              ASTE {
                [$property]: $value
                enumerable: true
                configurable: true
              }
            block.push AST __def-prop $current-left, $key, $descriptor
          else
            throw Error "Unknown property: $property"
        else
          block.push AST $current-left[$key] := $value
        current-left := next-left
      block.push AST $current-left
      ASTE $block
  else
    ASTE __import $left, $right

define operator binary >>> with precedence: 6, right-to-left: true
  if not @is-noop(left) and not @is-noop(right)
    let tmp = @tmp \ref
    AST
      let $tmp = $left
      $right <<< $tmp
  else
    ASTE $right <<< $left

define helper WeakMap = if is-function! GLOBAL.WeakMap then GLOBAL.WeakMap else class WeakMap
  let uid-rand()
    Math.random().to-string(36).slice(2)
  let create-uid()
    "$(uid-rand())-$(new Date().get-time())-$(uid-rand())-$(uid-rand())"
  let is-extensible = Object.is-extensible or #-> true
  
  def constructor()
    @_keys := []
    @_values := []
    // the keys which were once extensible but no longer are
    @_chilly := []
    @_uid := create-uid()
  
  let check(key)!
    let uid = @_uid
    if key ownskey uid
      let chilly = @_chilly
      if chilly.index-of(key) == -1
        chilly.push key
        @_keys.push key
        @_values.push key[uid]
  
  def get(key)
    if Object(key) != key
      throw TypeError "Invalid value used as weak map key"
    
    if is-extensible(key)
      key![@_uid]
    else
      check@ this, key
      let index = @_keys.index-of key
      if index == -1
        void
      else
        @_values[index]
  
  def has(key)
    if Object(key) != key
      throw TypeError "Invalid value used as weak map key"
    
    if is-extensible(key)
      key ownskey @_uid
    else
      check@ this, key
      @_keys.index-of(key) != -1
  
  let def-prop = if is-function! Object.define-property then Object.define-property else #(o, k, d)! -> o[k] := d.value
  def set(key, value)!
    if Object(key) != key
      throw TypeError "Invalid value used as weak map key"
    
    if is-extensible(key)
      def-prop key, @_uid, {
        +configurable
        +writable
        -enumerable
        value
      }
    else
      check@ this, key
      let keys = @_keys
      let mutable index = keys.index-of key
      if index == -1
        index := keys.length
        keys[index] := key
      @_values[index] := value
  
  def delete(key)!
    if Object(key) != key
      throw TypeError "Invalid value used as weak map key"
    
    if is-extensible(key)
      delete key[@_uid]
    else
      check@ this, key
      let keys = @_keys
      let mutable index = keys.index-of key
      if index != -1
        keys.splice index, 1
        @_values.splice index, 1

define helper __index-of-identical = #(array, item)
  if typeof item == \number
    if item is NaN
      for check, i in array by -1
        if check is NaN
          return i
      return -1
    else if item == 0
      let inf = 1 ~/ item
      for check, i in array by -1
        if check == 0 and 1 ~/ check == inf
          return i
      return -1
  array.index-of item

define helper Map = if is-function! GLOBAL.Map then GLOBAL.Map else class Map
  def constructor(iterable)
    @_keys := []
    @_values := []
    if iterable?
      for x from iterable
        @set x[0], x[1]
  
  def get(key)
    let index = __index-of-identical @_keys, key
    if index == -1
      void
    else
      @_values[index]
  
  def has(key)
    __index-of-identical(@_keys, key) != -1
  
  def set(key, value)!
    let keys = @_keys
    let mutable index = __index-of-identical keys, key
    if index == -1
      index := keys.length
      keys[index] := key
    @_values[index] := value
  
  def delete(key)
    let keys = @_keys
    let index = __index-of-identical(keys, key)
    if index == -1
      false
    else
      keys.splice index, 1
      @_values.splice index, 1
  
  def keys()*
    for key in @_keys by -1
      yield key
  
  def values()*
    for value in @_values by -1
      yield value
  
  def items()*
    let values = @_values
    for key, i in @_keys by -1
      yield [key, values[i]]
  def iterator = Map::items

define helper Set = if is-function! GLOBAL.Set then GLOBAL.Set else class Set
  def constructor(iterable)
    @_items := []
    if iterable?
      for item from iterable
        @add item
  
  def has(item)
    __index-of-identical(@_items, item) != -1
  def add(item)!
    let items = @_items
    if __index-of-identical(items, item) == -1
      items.push item
  def delete(item)!
    let items = @_items
    let index = __index-of-identical items, item
    if index != -1
      items.splice index, 1
      true
    else
      false
  def values()*
    for item in @_items by -1
      yield item
  def iterator = Set::values

define operator unary set! with type: \object, label: \construct-set
  let set = @tmp \s, false, \object
  if @is-array(node) and not @array-has-spread(node)
    if @elements(node).length == 0
      ASTE Set()
    else
      let parts = []
      for element in @elements(node)
        parts.push AST $set.add $element
      AST
        let $set = Set()
        $parts
        $set
  else
    let item = @tmp \x, false, \any
    AST
      let $set = Set()
      for $item in $node
        $set.add $item
      $set

define operator unary map! with type: \object, label: \construct-map
  if not @is-object(node)
    throw Error "map! can only be used on literal objects"
  
  let pairs = @pairs(node)
  if pairs.length == 0
    ASTE Map()
  else
    let map = @tmp \m, false, \object
    let parts = []
    for {key, value, property} in pairs
      if property?
        throw Error "Cannot use map! on an object with custom properties"
      parts.push AST $map.set $key, $value
    AST
      let $map = Map()
      $parts
      $map

macro first!(head)
  // FIXME: this is hackish, macro should be (head, ...tail)
  let tail = arguments[0].macroData[1 to -1]
  if tail.length == 0
    ASTE $head
  else
    @maybe-cache head, #(set-head, head)@
      AST
        $set-head
        $tail
        $head

macro last!()
  // FIXME: this is hackish, macro should be (...start, finish)
  let start = arguments[0].macroData[0 til -1]
  let finish = arguments[0].macroData[* - 1]
  if start.length == 0
    ASTE $finish
  else
    AST
      $start
      $finish
