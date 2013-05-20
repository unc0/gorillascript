// normal invocation, before we start tests
expect(true).to.be.ok
expect(true).to.be.true
expect(true).to.equal(true)
expect(true).to.equal true
expect(false).to.not.be.ok
expect(false).to.be.false
expect(false).to.equal(false)
expect(false).to.equal false

let get-true() -> true
let id(x) -> x
let add(x, y) -> x + y
let get-args() -> [].slice.call(arguments)
let get-this-and-args() -> [this].concat([].slice.call(arguments))

describe "function invocation", #
  describe "with zero arguments", #
    it "works with parentheses", #
      let value = get-true()
      expect(value).to.be.true
  
  describe "with one argument", #
    it "works with parentheses", #
      let obj = {}
      let value = id(obj)
      expect(value).to.equal obj
  
    it "does not require parentheses", #
      let obj = {}
      let value = id obj
      expect(value).to.equal obj
  
  describe "with two arguments", #
    it "works with parentheses", #
      let value = add(5, 6)
      expect(value).to.equal 11
    
    it "does not require parentheses", #
      let value = add 5, 6
      expect(value).to.equal 11
  
  describe "spread invocation", #
    it "works with parentheses", #
      expect(get-args()).to.eql []
      expect(get-args(1, 2, 3)).to.eql [1, 2, 3]
      let arr = [1, 2, 3]
      expect(get-args(...arr)).to.eql [1, 2, 3]
  
    it "does not require parentheses", #
      expect(get-args 1, 2, 3).to.eql [1, 2, 3]
      let arr = [1, 2, 3]
      expect(get-args ...arr).to.eql [1, 2, 3]
  
  describe "multi-line", #
    it "does not require commas if each argument is on its own line, with parentheses", #
      expect(get-args(
        1
        2
        3
        4)).to.eql [1, 2, 3, 4]
      
      expect(get-args(1
        2
        3
        4)).to.eql [1, 2, 3, 4]
      
      expect(get-args(1,
        2
        3
        4)).to.eql [1, 2, 3, 4]
      
      expect(get-args(1, 2
        3, 4)).to.eql [1, 2, 3, 4]
      
      expect(get-args(1, 2,
        3, 4)).to.eql [1, 2, 3, 4]
    
    it "does not require commas if each argument is on its own line, no parentheses", #
      expect(get-args 1,
        2
        3
        4).to.eql [1, 2, 3, 4]
      
      expect(get-args 1, 2, 3,
        4).to.eql [1, 2, 3, 4]

describe "function apply", #
  describe "with zero arguments", #->
    // TODO: compile GS, confirm it's an error, f@() is better as f@(void).
    //it "fails" 
  
  describe "with one argument", #
    it "works with parentheses", #
      let obj = spy()
      let value = get-this-and-args@(obj)
      expect(value).to.be.an(\array)
        .with.length(1)
        .and.have.property(0).that.equal(obj)
  
    it "does not require parentheses", #
      let obj = spy()
      let value = get-this-and-args@ obj
      expect(value).to.be.an(\array)
        .with.length(1)
        .and.have.property(0).that.equal(obj)
  
  describe "with two arguments", #
    it "works with parentheses", #
      let obj = spy()
      let value = get-this-and-args@(obj, \x)
      expect(value).to.eql [obj, \x]
    
    it "does not require parentheses", #
      let obj = spy()
      let value = get-this-and-args@ obj, \x
      expect(value).to.eql [obj, \x]
  
  describe "with spread invocation", #
    describe "as the first argument", #
      it "works with parentheses", #
        let obj = spy()
        let arr = [obj, 1, 2]
        expect(get-this-and-args@(...arr, 3)).to.eql [obj, 1, 2, 3]

      it "does not require parentheses", #
        let obj = spy()
        let arr = [obj, 1, 2]
        expect(get-this-and-args@ ...arr, 3).to.eql [obj, 1, 2, 3]
    
    describe "as not the first argument", #
      it "works with parentheses", #
        let obj = spy()
        let arr = [1, 2, 3]
        expect(get-this-and-args@(obj, ...arr)).to.eql [obj, 1, 2, 3]
  
      it "does not require parentheses", #
        let obj = spy()
        let arr = [1, 2, 3]
        expect(get-this-and-args@ obj, ...arr).to.eql [obj, 1, 2, 3]

describe "new call", #
  it "does not require parentheses, even for 0 arguments", #
    let now = new Date
    expect(now).to.be.an.instanceof(Date)
  
  it "allows chain after new call", #
    let now = new Date().get-time()
    expect(now).to.be.a(\number)
  
  it "works if the func is a call itself", #
    let get-Date() -> Date
    
    expect(new (get-Date())).to.be.an.instanceof(Date)
    expect(new (get-Date())().get-time()).to.be.a(\number)
  
  it "works if the func is a method call", #
    let x = {
      get-Date: #-> Date
    }
    let now = new Date().get-time()
    let weird-date = new (x.get-Date()) now
    expect(weird-date.get-time()).to.equal now
  
  it "works if the func is an access on a call", #
    let x = #-> {
      Date
    }
    let now = new Date().get-time()
    let weird-date = new (x().Date) now
    expect(weird-date.get-time()).to.equal now
  
  it "works if the func is an access on a literal array", #
    let now = new Date().get-time()
    let weird-date = new [Date][0] now
    expect(weird-date.get-time()).to.equal now
  
  it "works if the func is an access on a sliced literal array", #
    let now = new Date().get-time()
    let weird-date = new [Date][0 til 1][0] now
    expect(weird-date.get-time()).to.equal now
  
  describe "spread invocation", #
    let Class()!
      expect(this).to.be.an.instanceof(Class)
      @args := [].slice.call(arguments)
    
    it "works with parentheses", #  
      let arr = [1, 2, 3]
      expect(new Class(...arr))
        .to.have.property(\args).that.eql [1, 2, 3]

    it "does not require parentheses", #
      let arr = [1, 2, 3]
      expect(new Class ...arr)
        .to.have.property(\args).that.eql [1, 2, 3]
    
    it "can handle at least 200 arguments", #
      let arr = []
      for i in 0 til 200
        arr.push i
        expect(new Class ...arr)
          .to.have.property(\args).that.eql arr
    
    it "works for builtins like Date", #
      let date-values = [1987]
      expect(new Date(...date-values)).to.be.an.instanceof(Date)
      date-values.push 7
      expect(new Date(...date-values)).to.be.an.instanceof(Date)
      date-values.push 22
      expect(new Date(...date-values)).to.be.an.instanceof(Date)
