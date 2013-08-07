(function () {
  "use strict";
  var __create, __strnum, __typeof, ast;
  __create = typeof Object.create === "function" ? Object.create
    : function (x) {
      function F() {}
      F.prototype = x;
      return new F();
    };
  __strnum = function (strnum) {
    var type;
    type = typeof strnum;
    if (type === "string") {
      return strnum;
    } else if (type === "number") {
      return String(strnum);
    } else {
      throw new TypeError("Expected a string or number, got " + __typeof(strnum));
    }
  };
  __typeof = (function () {
    var _toString;
    _toString = Object.prototype.toString;
    return function (o) {
      if (o === void 0) {
        return "Undefined";
      } else if (o === null) {
        return "Null";
      } else {
        return o.constructor && o.constructor.name || _toString.call(o).slice(8, -1);
      }
    };
  }());
  ast = require("./jsast");
  module.exports = function (root, sources) {
    var doneLinesByFile, pos, walked;
    doneLinesByFile = __create(null);
    function walker(node, parent, position) {
      var _ref, doneLines, file, line, pos;
      pos = node.pos;
      file = pos.file;
      line = pos.line;
      if (file && sources[file] && line != null) {
        if ((_ref = doneLinesByFile[file]) != null) {
          doneLines = _ref;
        } else {
          doneLines = doneLinesByFile[file] = [];
        }
        if (!doneLines[line]) {
          doneLines[line] = true;
          if (line === 0 && 1 / line > 0) {
            return ast.Call(
              pos,
              ast.Binary(
                pos,
                ast.Ident(pos, "require"),
                ".",
                ast.Const(pos, "register")
              ),
              [
                ast.Const(pos, file),
                ast.Func(
                  pos,
                  null,
                  [
                    ast.Ident(pos, "module"),
                    ast.Ident(pos, "exports"),
                    ast.Ident(pos, "require")
                  ],
                  [],
                  ast.Block(pos, [
                    node,
                    ast.Comment(pos, "/* module: " + __strnum(file) + " */")
                  ])
                )
              ]
            );
          }
        }
      }
    }
    walked = root.walk(walker);
    pos = root.pos;
    return ast.Root(
      pos,
      ast.Block(pos, [
        ast.Func(
          pos,
          ast.Ident(pos, "require"),
          [ast.Ident(pos, "p")],
          ["mod", "path"],
          ast.BlockStatement(pos, [
            ast.Binary(
              pos,
              ast.Ident(pos, "path"),
              "=",
              ast.Call(
                pos,
                ast.Binary(
                  pos,
                  ast.Ident(pos, "require"),
                  ".",
                  ast.Const(pos, "resolve")
                ),
                [ast.Ident(pos, "p")]
              )
            ),
            ast.Binary(
              pos,
              ast.Ident(pos, "mod"),
              "=",
              ast.Binary(
                pos,
                ast.Binary(
                  pos,
                  ast.Ident(pos, "require"),
                  ".",
                  ast.Const(pos, "modules")
                ),
                ".",
                ast.Ident(pos, "path")
              )
            ),
            ast.IfStatement(
              pos,
              ast.Unary(pos, "!", ast.Ident(pos, "mod")),
              ast.Throw(pos, ast.Call(
                pos,
                ast.Ident(pos, "Error"),
                [
                  ast.Binary(
                    pos,
                    ast.Binary(
                      pos,
                      ast.Const(pos, 'failed to require "'),
                      "+",
                      ast.Ident(pos, "p")
                    ),
                    "+",
                    ast.Const(pos, '"')
                  )
                ],
                true
              ))
            ),
            ast.IfStatement(
              pos,
              ast.Unary(pos, "!", ast.Binary(
                pos,
                ast.Ident(pos, "mod"),
                ".",
                ast.Const(pos, "exports")
              )),
              ast.BlockStatement(pos, [
                ast.Binary(
                  pos,
                  ast.Binary(
                    pos,
                    ast.Ident(pos, "mod"),
                    ".",
                    ast.Const(pos, "exports")
                  ),
                  "=",
                  ast.Obj()
                ),
                ast.Call(
                  pos,
                  ast.Binary(
                    pos,
                    ast.Ident(pos, "mod"),
                    ".",
                    ast.Const(pos, "call")
                  ),
                  [
                    ast.Binary(
                      pos,
                      ast.Ident(pos, "mod"),
                      ".",
                      ast.Const(pos, "exports")
                    ),
                    ast.Ident(pos, "mod"),
                    ast.Binary(
                      pos,
                      ast.Ident(pos, "mod"),
                      ".",
                      ast.Const(pos, "exports")
                    ),
                    ast.Call(
                      pos,
                      ast.Binary(
                        pos,
                        ast.Ident(pos, "require"),
                        ".",
                        ast.Const(pos, "relative")
                      ),
                      [ast.Ident(pos, "path")]
                    )
                  ]
                )
              ])
            ),
            ast.Return(pos, ast.Binary(
              pos,
              ast.Ident(pos, "mod"),
              ".",
              ast.Const(pos, "exports")
            ))
          ])
        ),
        ast.Binary(
          pos,
          ast.Binary(
            pos,
            ast.Ident(pos, "require"),
            ".",
            ast.Const(pos, "modules")
          ),
          "=",
          ast.Obj()
        ),
        ast.Binary(
          pos,
          ast.Binary(
            pos,
            ast.Ident(pos, "require"),
            ".",
            ast.Const(pos, "resolve")
          ),
          "=",
          ast.Func(
            pos,
            null,
            [ast.Ident(pos, "path")],
            ["index", "reg"],
            ast.BlockStatement(pos, [
              ast.Binary(
                pos,
                ast.Ident(pos, "reg"),
                "=",
                ast.Binary(
                  pos,
                  ast.Ident(pos, "path"),
                  "+",
                  ast.Const(pos, ".gs")
                )
              ),
              ast.Binary(
                pos,
                ast.Ident(pos, "index"),
                "=",
                ast.Binary(
                  pos,
                  ast.Ident(pos, "path"),
                  "+",
                  ast.Const(pos, "/index.gs")
                )
              ),
              ast.Return(pos, ast.Binary(
                pos,
                ast.Binary(
                  pos,
                  ast.Binary(
                    pos,
                    ast.Binary(
                      pos,
                      ast.Ident(pos, "require"),
                      ".",
                      ast.Const(pos, "modules")
                    ),
                    ".",
                    ast.Ident(pos, "reg")
                  ),
                  "&&",
                  ast.Ident(pos, "reg")
                ),
                "||",
                ast.Binary(
                  pos,
                  ast.Binary(
                    pos,
                    ast.Binary(
                      pos,
                      ast.Binary(
                        pos,
                        ast.Ident(pos, "require"),
                        ".",
                        ast.Const(pos, "modules")
                      ),
                      ".",
                      ast.Ident(pos, "index")
                    ),
                    "&&",
                    ast.Ident(pos, "index")
                  ),
                  "||",
                  ast.Ident(pos, "path")
                )
              ))
            ])
          )
        ),
        ast.Binary(
          pos,
          ast.Binary(
            pos,
            ast.Ident(pos, "require"),
            ".",
            ast.Const(pos, "register")
          ),
          "=",
          ast.Func(
            pos,
            null,
            [
              ast.Ident(pos, "path"),
              ast.Ident(pos, "fn")
            ],
            [],
            ast.Return(pos, ast.Binary(
              pos,
              ast.Binary(
                pos,
                ast.Binary(
                  pos,
                  ast.Ident(pos, "require"),
                  ".",
                  ast.Const(pos, "modules")
                ),
                ".",
                ast.Ident(pos, "path")
              ),
              "=",
              ast.Ident(pos, "fn")
            ))
          )
        ),
        ast.Binary(
          pos,
          ast.Binary(
            pos,
            ast.Ident(pos, "require"),
            ".",
            ast.Const(pos, "relative")
          ),
          "=",
          ast.Func(
            pos,
            null,
            [ast.Ident(pos, "parent")],
            [],
            ast.Return(pos, ast.Func(
              pos,
              null,
              [ast.Ident(pos, "p")],
              ["i", "path", "seg", "segs"],
              ast.BlockStatement(pos, [
                ast.IfStatement(
                  pos,
                  ast.Binary(
                    pos,
                    ast.Call(
                      pos,
                      ast.Binary(
                        pos,
                        ast.Ident(pos, "p"),
                        ".",
                        ast.Const(pos, "charAt")
                      ),
                      [ast.Const(pos, 0)]
                    ),
                    "!==",
                    ast.Const(pos, ".")
                  ),
                  ast.Return(pos, ast.Call(
                    pos,
                    ast.Ident(pos, "require"),
                    [ast.Ident(pos, "p")]
                  ))
                ),
                ast.Binary(
                  pos,
                  ast.Ident(pos, "path"),
                  "=",
                  ast.Call(
                    pos,
                    ast.Binary(
                      pos,
                      ast.Ident(pos, "parent"),
                      ".",
                      ast.Const(pos, "split")
                    ),
                    [ast.Const(pos, "/")]
                  )
                ),
                ast.Binary(
                  pos,
                  ast.Ident(pos, "segs"),
                  "=",
                  ast.Call(
                    pos,
                    ast.Binary(
                      pos,
                      ast.Ident(pos, "p"),
                      ".",
                      ast.Const(pos, "split")
                    ),
                    [ast.Const(pos, "/")]
                  )
                ),
                ast.Call(pos, ast.Binary(
                  pos,
                  ast.Ident(pos, "path"),
                  ".",
                  ast.Const(pos, "pop")
                )),
                ast.For(
                  pos,
                  ast.Binary(
                    pos,
                    ast.Ident(pos, "i"),
                    "=",
                    ast.Const(pos, 0)
                  ),
                  ast.Binary(
                    pos,
                    ast.Ident(pos, "i"),
                    "<",
                    ast.Binary(
                      pos,
                      ast.Ident(pos, "segs"),
                      ".",
                      ast.Const(pos, "length")
                    )
                  ),
                  ast.Unary(pos, "++", ast.Ident(pos, "i")),
                  ast.BlockStatement(pos, [
                    ast.Binary(
                      pos,
                      ast.Ident(pos, "seg"),
                      "=",
                      ast.Binary(
                        pos,
                        ast.Ident(pos, "segs"),
                        ".",
                        ast.Ident(pos, "i")
                      )
                    ),
                    ast.IfStatement(
                      pos,
                      ast.Binary(
                        pos,
                        ast.Ident(pos, "seg"),
                        "===",
                        ast.Const(pos, "..")
                      ),
                      ast.Call(pos, ast.Binary(
                        pos,
                        ast.Ident(pos, "path"),
                        ".",
                        ast.Const(pos, "pop")
                      )),
                      ast.IfStatement(
                        pos,
                        ast.Binary(
                          pos,
                          ast.Ident(pos, "seg"),
                          "!==",
                          ast.Const(pos, ".")
                        ),
                        ast.Call(
                          pos,
                          ast.Binary(
                            pos,
                            ast.Ident(pos, "path"),
                            ".",
                            ast.Const(pos, "push")
                          ),
                          [ast.Ident(pos, "seg")]
                        )
                      )
                    )
                  ])
                ),
                ast.Return(pos, ast.Call(
                  pos,
                  ast.Ident(pos, "require"),
                  [
                    ast.Call(
                      pos,
                      ast.Binary(
                        pos,
                        ast.Ident(pos, "path"),
                        ".",
                        ast.Const(pos, "join")
                      ),
                      [ast.Const(pos, "/")]
                    )
                  ]
                ))
              ])
            ))
          )
        ),
        walked.body
      ]),
      walked.variables,
      walked.declarations
    );
  };
}.call(this));
