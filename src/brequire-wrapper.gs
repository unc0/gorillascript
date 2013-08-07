require! ast: './jsast'

module.exports := #(root, sources)
  let done-lines-by-file = { extends null }
  let walker(node, parent, position)
    let pos = node.pos
    let {file, line} = pos
    if file and sources[file] and line?
      let done-lines = done-lines-by-file[file] ?= []
      if not done-lines[line]
        done-lines[line] := true
        if line is 0
          ast.Call(pos,
            ast.Binary(pos,
              ast.Ident pos, "require"
              '.'
              ast.Const pos, "register"
            )
            [ // args
              ast.Const pos, file
              ast.Func(pos, null,
                [ // params
                  ast.Ident pos, "module"
                  ast.Ident pos, "exports"
                  ast.Ident pos, "require"
                ], []
                ast.Block pos, [
                  node
                  ast.Comment pos, "/* module: $file */"
                ]
              )
            ]
          )
        else
          void
  let walked = root.walk walker
  let pos = root.pos
  ast.Root pos, ast.Block(pos, [
    ast.Func(pos,
      ast.Ident pos, 'require'
      [ast.Ident(pos, 'p')]
      ['mod', 'path']
      ast.BlockStatement(pos,[
        ast.Binary(pos,
          ast.Ident pos, 'path'
          '='
          ast.Call(pos,
            ast.Binary(pos, ast.Ident(pos, 'require'), '.', ast.Const(pos, 'resolve'))
            [ast.Ident(pos, 'p')]
          )
        )
        ast.Binary(pos,
          ast.Ident pos, 'mod'
          '='
          ast.Binary(pos,
            ast.Binary(pos, ast.Ident(pos, 'require'), '.', ast.Const(pos, 'modules'))
            '.'
            ast.Ident pos, 'path'
          )
        )
        ast.IfStatement(pos,
          ast.Unary pos, '!', ast.Ident(pos, 'mod')
          // when true
          ast.Throw(pos,
            ast.Call(pos,
              ast.Ident pos, 'Error'
              [ // args
                ast.Binary(pos,
                  ast.Binary(pos,
                    ast.Const pos, 'failed to require "'
                    '+'
                    ast.Ident pos, 'p'
                  )
                  '+'
                  ast.Const pos, '"'
                )
              ]
              true
            )
          )
        )
        ast.IfStatement(pos,
          ast.Unary pos, '!', ast.Binary(pos, ast.Ident(pos, 'mod'), '.', ast.Const(pos, 'exports'))
          // when true
          ast.BlockStatement(pos, [
            ast.Binary(pos,
              ast.Binary(pos, ast.Ident(pos, 'mod'), '.', ast.Const(pos, 'exports'))
              '='
              ast.Obj()
            )
            ast.Call(pos,
              ast.Binary(pos, ast.Ident(pos, 'mod'), '.', ast.Const(pos, 'call'))
              [ // args
                ast.Binary(pos, ast.Ident(pos, 'mod'), '.', ast.Const(pos, 'exports'))
                ast.Ident pos, 'mod'
                ast.Binary(pos, ast.Ident(pos, 'mod'), '.', ast.Const(pos, 'exports'))
                ast.Call(pos,
                  ast.Binary(pos, ast.Ident(pos, 'require'), '.', ast.Const(pos, 'relative'))
                  [ast.Ident(pos, 'path')]
                )
              ]
            )
          ])
        )
        ast.Return(pos,
          ast.Binary(pos, ast.Ident(pos, 'mod'), '.', ast.Const(pos, 'exports'))
        )
      ])
    ) // require()
    ast.Binary(pos,
      ast.Binary(pos, ast.Ident(pos, 'require'), '.', ast.Const(pos, 'modules'))
      '='
      ast.Obj()
    )
    ast.Binary(pos,
      ast.Binary(pos, ast.Ident(pos, 'require'), '.', ast.Const(pos, 'resolve'))
      '='
      ast.Func(pos, null,
        [ast.Ident(pos, 'path')]
        ['index', 'reg']
        ast.BlockStatement(pos, [
          ast.Binary(pos,
            ast.Ident pos, 'reg'
            '='
            ast.Binary(pos, ast.Ident(pos, 'path'), '+', ast.Const(pos, '.gs'))
          )
          ast.Binary(pos,
            ast.Ident pos, 'index'
            '='
            ast.Binary(pos, ast.Ident(pos, 'path'), '+', ast.Const(pos, '/index.gs'))
          )
          ast.Return(pos,
            ast.Binary(pos,
              ast.Binary(pos,
                ast.Binary(pos,
                  ast.Binary(pos, ast.Ident(pos, 'require'), '.', ast.Const(pos, 'modules'))
                  '.'
                  ast.Ident pos, 'reg'
                )
                '&&'
                ast.Ident pos, 'reg'
              )
              '||'
              ast.Binary(pos,
                ast.Binary(pos,
                  ast.Binary(pos,
                    ast.Binary(pos, ast.Ident(pos, 'require'), '.', ast.Const(pos, 'modules'))
                    '.'
                    ast.Ident pos, 'index'
                  )
                  '&&'
                  ast.Ident pos, 'index'
                )
                '||'
                ast.Ident pos, 'path'
              )
            )
          )
        ])
      )
    ) // resolve()
    ast.Binary(pos,
      ast.Binary(pos, ast.Ident(pos, 'require'), '.', ast.Const(pos, 'register'))
      '='
      ast.Func(pos, null,
        [ // params
          ast.Ident pos, 'path'
          ast.Ident pos, 'fn'
        ], [],
        ast.Return(pos,
          ast.Binary(pos,
            ast.Binary(pos,
              ast.Binary(pos, ast.Ident(pos, 'require'), '.', ast.Const(pos, 'modules'))
              '.'
              ast.Ident pos, 'path'
            )
            '='
            ast.Ident pos, 'fn'
          )
        )
      )
    ) // register()
    ast.Binary(pos,
      ast.Binary(pos, ast.Ident(pos, 'require'), '.', ast.Const(pos, 'relative'))
      '='
      ast.Func(pos, null,
        [ast.Ident(pos, 'parent')], [],
        ast.Return(pos,
          ast.Func(pos, null,
            [ast.Ident(pos, 'p')]
            [
              'i'
              'path', 'seg', 'segs'
            ]
            ast.BlockStatement(pos, [
              ast.IfStatement(pos,
                ast.Binary(pos,
                  ast.Call(pos,
                    ast.Binary(pos, ast.Ident(pos, 'p'), '.', ast.Const(pos, 'charAt'))
                    [ast.Const(pos, 0)]
                  )
                  '!=='
                  ast.Const pos, '.'
                )
                // when true
                ast.Return(pos,
                  ast.Call(pos, ast.Ident(pos, 'require'), [ast.Ident(pos, 'p')])
                )
              ) // if end
              ast.Binary(pos,
                ast.Ident pos, 'path'
                '='
                ast.Call(pos,
                  ast.Binary(pos, ast.Ident(pos, 'parent'), '.', ast.Const(pos, 'split'))
                  [ast.Const(pos, '/')]
                )
              )
              ast.Binary(pos,
                ast.Ident pos, 'segs'
                '='
                ast.Call(pos,
                  ast.Binary(pos, ast.Ident(pos, 'p'), '.', ast.Const(pos, 'split'))
                  [ast.Const(pos, '/')]
                )
              )
              ast.Call(pos,
                ast.Binary(pos, ast.Ident(pos, 'path'), '.', ast.Const(pos, 'pop'))
              )
              ast.For(pos,
                ast.Binary(pos, ast.Ident(pos, 'i'), '=', ast.Const(pos, 0))
                ast.Binary(pos,
                  ast.Ident pos, 'i'
                  '<'
                  ast.Binary(pos, ast.Ident(pos, 'segs'), '.', ast.Const(pos, 'length'))
                )
                ast.Unary(pos, '++', ast.Ident(pos, 'i'))
                ast.BlockStatement(pos,[
                  ast.Binary(pos,
                    ast.Ident(pos, 'seg')
                    '='
                    ast.Binary(pos, ast.Ident(pos, 'segs'), '.', ast.Ident(pos, 'i'))
                  )
                  ast.IfStatement(pos,
                    ast.Binary(pos, ast.Ident(pos, 'seg'), '===', ast.Const(pos, '..'))
                    // when true
                    ast.Call(pos,
                      ast.Binary(pos, ast.Ident(pos, 'path'), '.', ast.Const(pos, 'pop'))
                    )
                    // when false
                    ast.IfStatement(pos,
                      ast.Binary(pos, ast.Ident(pos, 'seg'), '!==', ast.Const(pos, '.'))
                      // when true
                      ast.Call(pos,
                        ast.Binary(pos, ast.Ident(pos, 'path'), '.', ast.Const(pos, 'push'))
                        [ast.Ident(pos, 'seg')]
                      )
                    )
                  )
                ])
              )
              ast.Return(pos,
                ast.Call(pos,
                  ast.Ident pos, 'require'
                  [ // args
                    ast.Call(pos,
                      ast.Binary(pos, ast.Ident(pos, 'path'), '.', ast.Const(pos, 'join'))
                      [ast.Const(pos, '/')]
                    )
                  ]
                )
              )
            ])
          )
        )
      )
    ) // relative()
    walked.body
  ]), walked.variables, walked.declarations

