
let SVGPlus = {
  getElementById: function(id){
    let el = document.getElementById(id);
    return this.SVGElementToSVGPlusElement(el);
  },

  is_getter: function(obj, key) {
    let instance = Object.getOwnPropertyDescriptor(obj, key);
    let proto = Object.getOwnPropertyDescriptor(obj.__proto__, key);
    if (typeof instance !== 'undefined' && typeof proto !== 'undefined'){
      let mix = Object.assign(proto, instance);
      return ('get' in mix && typeof mix.get !== "undefined") || 'value' in mix
    }else if(typeof instance !== 'undefined'){
      return 'value' in instance
    }else if (typeof proto !== 'undefined'){
      return ('get' in proto && typeof proto.get !== "undefined")
    }
    return false
  },

  is_setter: function(obj, key) {
    let instance = Object.getOwnPropertyDescriptor(obj, key);
    let proto = Object.getOwnPropertyDescriptor(obj.__proto__, key);
    if (typeof instance !== 'undefined' && typeof proto !== 'undefined'){
      let mix = Object.assign(proto, instance);
      return ('set' in mix && typeof mix.set !== "undefined") || 'value' in mix
    }else if(typeof instance !== 'undefined'){
      return 'value' in instance
    }else if (typeof proto !== 'undefined'){
      return ('set' in proto && typeof proto.set !== "undefined")
    }
    return false
  },

  is_method: function(obj, key) {
    return (typeof obj[key] !== 'undefined' && obj[key] instanceof Function)
  },

  proxy_handlers: {
    get: (target, prop, receiver) => {
      if (SVGPlus.is_getter(target, prop)){
        return target[prop];
      }else if (SVGPlus.is_getter(target.el, prop)){
        return target.el[prop]
      }
    },
    set: (target, prop, value) => {
      if (SVGPlus.is_setter(target, prop)){
        target[prop] = value;
      }else if (SVGPlus.is_setter(target.el, prop)){
        return target.el[prop] = value;
      }
    },
    apply: (target, method, args) => {
      console.log(method);
      if (SVGPlus.is_method(target, method)){
        target.apply(method, args)
      }else if(SVGPlus.is_method(target.el, method)){
        target.el.apply(method, args);
      }
    }
  },


  SVGElementToSVGPlusElement: function(elem){
    if (!(elem instanceof Element)){
      throw 'error'
      return null
    }
    elem._props = {};
    elem._styles = {};
    elem.extend = function(extension){
      return SVGPlus.extend(this, extension);
    }
    Object.defineProperty(elem, 'styles', {
      get : function(){
        return this._styles;
      },
      set: function(val){
        if (typeof val != 'object'){
          throw `not an object`;
          return
        }
        for (var key in val){
          let style = val[key];
          if (typeof style == 'string' || typeof style == 'number'){
            this.style.setProperty(key, style);
            this._styles[key] = style;
          }
        }
      }
    })
    Object.defineProperty(elem, 'props', {
      get : function(){
        return this._props;
      },
      set: function(val){
        if (typeof val != 'object'){
          throw `not an object`;
          return
        }
        for (var key in val){
          let att = val[key];
          if (typeof att == 'string' || typeof att == 'number'){
            this.setAttribute(key, att);
            this._props[key] = att;
          }else if(key == 'style' || key == 'styles' && typeof att == 'object'){
            this.styles = att;
          }
        }
      }
    })
    elem.createChild = function(name, props = null){
      let child = SVGPlus.create(name, props);
      this.appendChild(child);
      return child;
    }
    if (elem instanceof SVGPathElement){
      elem._d = new DPath(elem.getAttribute('d'));
      Object.defineProperty(elem, 'd', {
        set: function(val){
          this.d.d_string = val;
        },
        get: function(){
          return this._d;
        }
      })
      elem.d.addUpdateListener(() => {
        elem.setAttribute('d', elem.d+'')
      })
      let keys = Object.getOwnPropertyNames(DPath.prototype);
      keys.forEach((key) => {
        let func = DPath.prototype[key];
        if (func instanceof Function){
          elem[key] = function(arg){
            this.d[key].apply(this.d, arguments)
            return this
          };
        }
      })
      elem.clear = function(){
        elem.d.clear()
      }
    }
    return elem;
  },
  create: function(name, props = null) {
    let el = this.make(name);
    if (el == null){
      throw 'error null element'
      return null
    }
    if(props == null){
      return this.SVGElementToSVGPlusElement(el)
    }else{
      el = this.SVGElementToSVGPlusElement(el)
      el.props = props;
      return el
    }
  },
  make: function(name){
    if (`animate animateMotion animateTransform circle clipPath
      color-profile defs desc discard ellipse feBlend feColorMatrix
      feComponentTransfer feComposite feConvolveMatrix feDiffuseLighting
      feDisplacementMap feDistantLight feDropShadow feFlood feFuncA
      feFuncB feFuncG feFuncR feGaussianBlur feImage feMerge feMergeNode
      feMorphology feOffset fePointLight feSpecularLighting feSpotLight
      feTile feTurbulence filter foreignObject g hatch hatchpath image
      line linearGradient marker mask mesh meshgradient meshpatch meshrow
      metadata mpath path pattern polygon polyline radialGradient rect
      script set solidcolor stop style svg switch symbol text textPath
      title tspan unknown use view`.indexOf(name) != -1){
      return document.createElementNS("http://www.w3.org/2000/svg", name);

    }else{
      return document.createElement(name);
    }
  },
  parseElement: function(elem = null) {
    if (elem == null){
      throw `${new PlusError('null element given to parser')}`
    }
    if (typeof elem === 'string'){
      let _elem = document.getElementById(elem);
      if (_elem == null){

        throw `${new PlusError(`Could not parse ${elem},\n\t\t\tas it doesn't exist.`)}`
        return null
      }else{
        try {
          _elem = this.parseElement(_elem);
        }catch(e){
          throw e
          return null
        }
        return _elem
      }
    }else if (elem instanceof Element){
      return elem
    }else{
      throw 'invalid element'
      return null
    }
  },
  parseSVGstring: function(string){
    let parser = new DOMParser()
    let doc = parser.parseFromString(string, "image/svg+xml");
    let errors = doc.getElementsByTagName('parsererror');
    if (errors && errors.length > 0){
      throw '' + new PlusError(`${errors[0]}`)
      return null
    }
    return doc.firstChild
  },
  importFromObject: function(el, callback){
    el = this.parseElement(el);
    console.log(`${el}`);
    let id = el.id;
    el.onload = () => {
      let svg = el.contentDocument.all[0];
      svg.setAttribute('id', id)
      let parent = el.parentNode;
      parent.removeChild(el);
      parent.appendChild(svg)
      if ((`${svg}`).indexOf('SVGSVGElement') != -1){
        let svgplus = new SvgSvgElement(svg)
        if (callback instanceof Function){
          callback(svgplus)
        }
      }
    }
  },
  extend: function(elem, extension){
    let keys = Object.getOwnPropertyNames(extension.prototype);
    keys.forEach((key) => {
      console.log(key);
      if (key == 'constructor'){
      }else{
        if (key in elem){
          throw `Property ${key} has been overwritten`
        }
        var ee = Object.getOwnPropertyDescriptor(extension.prototype,key);
        Object.defineProperty(elem, key, ee);
      }
    })
    new extension.prototype.constructor(elem);
    return elem
  }
}

let make = function(elem){

}

class PlusError{
  constructor(message, class_name = "Object"){
    this.msg = message;
    this.cls = class_name;
    let stack = new Error('helloworld');
    this.stack = stack.stack

  }
  _parse_stack(){
    let stack = this.stack
    let lines = stack.split('at ');
    let message = '';
    let con = 0;
    let tab = "";
    for (var i = 2; i < lines.length-1; i++){
      let conf = false;

      let clas = null;
      let lctn = null;
      let mthd = null;

      let line = lines[i];
      line = lines[i].replace(/\t|\n|\[.*\] |  +/g, '').replace(/ \((.*)\)/g, (a,b) =>{
        b = b.split('/');
        b = b[b.length - 1];
        b = b.split(':')

        lctn = `${b[0]} line ${b[1]}`;
        return ''
      })
      let parts = line.split(/ |\./g);

      if (parts.length === 3 && parts[1] == "get" || parts[1] == "set"){
        mthd = `${parts[1]}ting ${parts[2]} of ${parts[0]}\t (${lctn})`
      }else if(parts.length == 2){
        mthd = `whilst calling ${parts[1]} of ${parts[0]}\t (${lctn})`
      }
      if (parts[0] === 'new'){
        con++;
        conf = true;
        mthd = `whilst constructing new ${parts[1]}\t (${lctn})`
        clas = parts[1];
      }else if(parts[0] === 'Object'){
        clas = this.cls;
      }else{
        clas = parts[0];
      }
      if ((conf && con == 1)||(!conf)){
        message = mthd + '\n' + tab + message;
      }
      tab += '\t'
      // stack_data.push(this._stack_line_parser(line))
    }
    return 'Error\n' + message + tab + this.msg
    // console.log(stack_data);
  }

  toString(){
    return this._parse_stack()
  }
}

class LinkItem{
  constructor(){
    this.last = null;
    this.next = null;
    this.length = 0;
  }
  link(l2){
    if (l2 instanceof LinkItem){
      this.next = l2;
      l2.last = this
    }
  }
  break(dir = 'both'){
    if (dir === 'next'){
      if (this.next != null){
        this.next.last = null;
        this.next = null;
      }
    }else if (dir === 'last'){
      if (this.last != null){
        this.last.next = null;
        this.last = null;
      }
    }else if(dir === 'both'){
      if (this.last != null){
        this.last.next = null;
        this.last = null;
      }
      if (this.next != null){
        this.next.last = null;
        this.next = null;
      }
    }
  }
}
class LinkList{
  constructor(){
    this.start = null;
    this.end = null;
    this.length = 0;
    this._onupdate = [];
  }

  addUpdateListener(callback){
    if (callback instanceof Function){
      this._onupdate.push(callback)
    }else{
      throw 'addUpdateListener expects a Function as its only parameter'
    }
  }

  _update(){
    this._onupdate.forEach((callback) => {
      callback()
    });
  }

  // Pushes LinkItem or LinkList at the end of this list
  push(item){
    if (item instanceof LinkItem){
      if ( this.contains(item) ){
        throw 'The given item is already contained within this list'
        return
      }

      this.length ++;

      //if the node was unset <start> => item <= <end>
      if (this.end == null || this.start == null){
        this.start = item; // <start> => item
        this.end = item;   // <end> => end

        //Otherwise end refers to <end> <=> <item>
        //                        <end> => <item>
      }else{
        this.end.link(item)
        this.end = item;
      }
    }else if(item instanceof LinkList){
      if ( this.contains(item) ){
        throw 'The given list contains elements already contained within this list\nELEMENTS SHOULD NOT BE CONTAINED IN MULTIPLY LISTS'
        return
      }

      this.length += item.length
      //if node not set <start> => <item.start>  <item.end> <= <end>
      if (this.end == null || this.start == null){
        this.start = item.start;
        this.end = item.end;

        //Else      <end> <=> item
        //          item <= <end>
      }else{
        this.end.link(item.start)
        this.end = item.end;
      }
    }
    this._update();
  }

  // Pop linked item from the end of the list
  pop(){
    if (this.end == null || this.start == null){
      return null
    }else if (this.end == this.start){
      this.length = 0;
      let temp = this.end;
      this.end = null;
      this.start = null;
      return temp;
    }else{
      this.length --;
      let oldl = this.end;
      let newl = this.end.last
      oldl.break();
      this.end = newl;
      return oldl
    }
    this._update();
  }

  // Dequeue linked item from the start of the list
  dequeue(){
    if (this.end == null || this.start == null){
      return null
    }else if (this.end == this.start){
      this.length = 0;

      let temp = this.start;
      this.end = null;
      this.start = null;
      return temp;
    }else{
      this.length --;

      let oldl = this.start;
      let newl = this.start.next;
      oldl.break();
      this.start = newl;
      return oldl
    }
    this._update()
  }

  // Puts LinkList or LinkItem at start of this list
  queue(item){
    if (item instanceof LinkItem){
      if ( this.contains(item) ){
        throw 'The given item is already contained within this list'
        return
      }

      this.length ++;

      //not set:  <start> => item <= <end>
      if (this.end == null || this.start == null){
        this.start = item;
        this.end = item;

        // else: <item> <=> <start> | <start> => <item>
      }else{
        item.link(this.start);
        this.start = item;
      }


    }else if(item instanceof LinkList){
      if ( this.contains(item) ){
        throw 'The given list contains elements already contained within this list\nELEMENTS SHOULD NOT BE CONTAINED IN MULTIPLY LISTS'
        return
      }

      this.length += item.length;

      // <start> => item <= <end>
      if (this.start == null){
        this.start = item.start;
        this.end = item.end;

        // item <=> <start> | <start> => item
      }else{
        item.end.link(start)
        this.start = item.start;
      }
    }
    this._update();
  }

  forEach(visit){
    if (!(visit instanceof Function)){
      throw 'forEach expects a function as its first parameter'
      return
    }

    let cur = this.start;
    let i = 0;
    visit(cur, i);
    while (cur != this.end){
      if (cur.next == null){
        throw 'List is disjointed'
        return
      }else{
        cur = cur.next;
        i++;
        visit(cur, i);
      }
    }
  }

  contains(val){
    let res = false;
    if (val instanceof LinkItem){
      this.forEach((item) => {
        res |= (item == val);
      });
    }else if (val instanceof LinkList){
      this.forEach((item) => {
        val.forEach((val_item) => {
          res |= (item == val_item);
        })
      })
    }
    return res
  }

  clear(){
    this.end = null;
    this.start = null;
    this.length = 0;
    this._update();
  }
}

class CPoint extends LinkItem{
  constructor(string){
    super()
    this.precision = 5;
    this.cmd_type = 'L';
    //p => x, y
    this.p = new Vector(0, 0);
    //c1 => x1, y1
    this.c1 = new Vector(0, 0);
    //c2 => x2, y2
    this.c2 = new Vector(0, 0);

    //r => rx, ry
    this.r = new Vector(0, 0);
    this.x_axis_rotation = 0;
    this.large_arc_flag = 0;
    this.sweep_flag = 0;

    this.cmd = string
  }

  /* Set Svg Command Point
  svg-path-command: String
  String Format:
  'M x, y' or 'm dx, dy'
  'L x, y' or 'l dx, dy'
  'H x' or 'h dx'
  'V y' or 'v dy'
  'C x1, y1, x2, y2, x, y' or 'c dx1, dy1, dx2, dy2, dx, dy'
  'Q x1, y1, x, y' or 'q dx1 dy1, dx dy'
  'S x, y' or 's dx, dy'
  'T x, y' or 't dx, dy'
  'A rx ry x-axis-rotation large-arc-flag sweep-flag x y' or 'a rx ry x-axis-rotation large-arc-flag sweep-flag dx dy' */
  set cmd(string){
    if (string == null){
      return
    }

    if (typeof string != 'string'){
      this.cmd_type = null;
      throw `Error setting cmd:\ncmd must be set a string, not ${typeof string}`
      return
    }

    //Get command type
    let type = string[0];


    //If z, then set cmd_type and return
    if (type == 'z'|| type == 'Z'){
      this.cmd_type = type;
      return
    }
    if (('MmLlHhVvCcSsQqTtAa').indexOf(type) == -1){
      this.cmd_type = null;
      throw `Error setting cmd:\n${type} is not a valid type`
      return
    }

    //Get numbers
    let param_string = string.slice(1);
    let param_floats = [];
    try{
      param_string.replace(/(-?\d*\.?\d+)/g, (num) => {
        param_floats.push(parseFloat(num))
      })
    }catch (err){
      throw `Error setting cmd:\nError parsing params\n${err}`
      return
    }

    //Check if input is valid according to command type
    let error = (num, form) => {return `Error setting cmd:\n${string} is of command type: ${type} which requires ${num} number parameters ${form} but ${param_floats.length} where given ${param_floats}`}
    if (('M|m||L|l||T|t').indexOf(type) != -1){
      if (param_floats.length != 2){
        throw error(2, 'x, y');
        return
      }
      this.p = new Vector(param_floats);
    }else if(type == 'C' || type == 'c'){
      if (param_floats.length != 6){
        throw error(6, '(x1, y1, x2, y2, x, y)')
        return
      }
      this.c1 = new Vector(param_floats)
      this.c2 = new Vector(param_floats, 2)
      this.p = new Vector(param_floats, 4)
    }else if(type == 'H' || type == 'h'){
      if (param_floats.length != 1){
        throw error(1, '(x)')
        return
      }
      this.x = param_floats[0]
    }else if(type == 'V' || type == 'v'){
      if (param_floats.length != 1){
        throw error(1, '(y)')
        return
      }
      this.y = param_floats[0]
    }else if(type == 'S' || type == 's'){
      if (param_floats.length != 4){
        throw error(4, '(x2, y2, x, y)')
        return
      }
      this.c2 = new Vector(param_floats)
      this.p = new Vector(param_floats, 2)
    }else if(type == 'Q' || type == 'q'){
      if (param_floats.length != 4){
        throw error(4, '(x1, y1, x, y)')
        return
      }
      this.c1 = new Vector(param_floats)
      this.p = new Vector(param_floats, 2)
    }else if(type == 'A' || type == 'a'){
      if (param_floats.length != 7){
        throw error(7, '(rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, x, y)')
        return
      }
      this.r = new Vector(param_floats);
      this.x_axis_rotation = param_floats[2];
      this.large_arc_flag = param_floats[3];
      this.sweep_flag = param_floats[4];
      this.p = new Vector(param_floats, 5)
    }

    //If inputs where valid set cmd_type
    this.cmd_type = type;
  }

  //Return String svg-path-command
  get cmd(){
    return this.toString()
  }

  get x(){
    return this.p.x;
  }
  set x(val){
    this.p.x = val;
  }
  get y(){
    return this.p.y;
  }
  set y(val){
    this.p.y = val;
  }

  _v_s(val){
    return `${this[val].x.toPrecision(this.precision)}${this[val].y>=0?',':''}${this[val].y.toPrecision(this.precision)}`
  }

  isAbsolute(){
    return (this.cmd_type && (this.cmd_type == this.cmd_type.toUpperCase()))
  }

  add(v){
    this.p = this.p.add(v);
    this.c1 = this.c1.add(v);
    this.c2 = this.c2.add(v);
  }
  sub(v){
    this.p = this.p.sub(v);
    this.c1 = this.c1.sub(v);
    this.c2 = this.c2.sub(v);
  }
  div(v){
    this.p = this.p.div(v);
    this.c1 = this.c1.div(v);
    this.c2 = this.c2.div(v);
  }
  mul(v){
    this.p = this.p.mul(v);
    this.c1 = this.c1.mul(v);
    this.c2 = this.c2.mul(v);
  }

  grad(v){
    return this.p.grad(v);
  }

  dist(v){
    console.log(v);
    return this.p.dist(v);
  }

  distToLine(v){
    return this.p.dist(v);
  }

  toString(){
    let cmr = (v) =>{
      if (v.x >= 0){
        return ','
      }else{
        return ''
      }
    }

    switch (this.cmd_type.toUpperCase()) {
      //    Move: x, y
      case 'M': return `${this.cmd_type}${this._v_s('p')}`;

      //    Line: x, y
      case 'L': return `${this.cmd_type}${this._v_s('p')}`;

      //    Horizontal Line: x
      case 'H': return `${this.cmd_type}${this.x}`;

      //    Vertical Line: y
      case 'V': return `${this.cmd_type}${this.y}`;

      //    Bézier Curve: x1, y1, x2, y2, x, y
      case 'C': return `${this.cmd_type}${this._v_s('c1')}${cmr(this.c2)}${this._v_s('c2')}${cmr(this.p)}${this._v_s('p')}`;

      //    Reflection Bézier: x2, y2, x, y
      case 'S': return `${this.cmd_type}${this._v_s('c2')}${cmr(this.p)}${this._v_s('p')}`;

      //    Quadratic Curve: x1, y1, x, y
      case 'Q': return `${this.cmd_type}${this._v_s('c1')}${cmr(this.p)}${this._v_s('p')}`;

      //    Quadratic Curve String: x, y
      case 'T': return `${this.cmd_type}${this._v_s('c1')}${cmr(this.p)}${this._v_s('p')}`;

      //    Arc: rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, x, y
      case 'A': return `${this.cmd_type}${this._v_s('r')},${this.x_axis_rotation},${this.large_arc_flag},${this.sweep_flag}${cmr(this.p)}${this._v_s('p')}`;

      //    Close:
      case 'Z': return `${this.cmd_type}`
    }
  }
}
class DPath extends LinkList{
  constructor(string = null){
    super();
    if (string != null && typeof string !== 'undefined' && string.length != 0){
      this.d_string = string;
    }
  }

  //Path push functions
    L(v){
      if (v instanceof Vector){
        this.push(new CPoint(`L${v}`))
        return this
      }else{
        throw 'Error:\nL takes a single vector parameter';
      }
    }
    l(v){
      if (v instanceof Vector){
        this.push(new CPoint(`l${v}`))
        return this
      }else{
        throw 'Error:\nl takes a single vector parameter';
      }
    }

    M(v){
      if (v instanceof Vector){
        this.push(new CPoint(`M${v}`))
        return this
      }else{
        throw 'Error:\nM takes a single vector parameter';
      }
    }

    Q(v1, v2){
      if (v1 instanceof Vector && v2 instanceof Vector){
        this.push(new CPoint(`Q${v1},${v2}`))
        return this
      }else{
        throw 'Error:\nQ takes two vectors as its parameters';
      }
    }
    q(v1, v2){
      if (v1 instanceof Vector && v2 instanceof Vector){
        this.push(new CPoint(`q${v1},${v2}`))
        return this
      }else{
        throw 'Error:\nq takes two vectors as its parameters';
      }
    }

    S(v1, v2){
      if (v1 instanceof Vector && v2 instanceof Vector){
        this.push(new CPoint(`S${v1},${v2}`))
        return this
      }else{
        throw 'Error:\nS takes two vectors as its parameters';
      }
    }
    s(v1, v2){
      if (v1 instanceof Vector && v2 instanceof Vector){
        this.push(new CPoint(`s${v1},${v2}`))
        return this
      }else{
        throw 'Error:\ns takes two vectors as its parameters';
      }
    }

    T(v1, v2){
      if (v1 instanceof Vector && v2 instanceof Vector){
        this.push(new CPoint(`T${v1},${v2}`))
        return this
      }else{
        throw 'Error:\nT takes two vectors as its parameters';
      }
    }
    t(v1, v2){
      if (v1 instanceof Vector && v2 instanceof Vector){
        this.push(new CPoint(`t${v1},${v2}`))
        return this
      }else{
        throw 'Error:\nt takes two vectors as its parameters';
      }
    }

    __boolHelp(val){
      if (typeof val === 'number'){
        return val > 0 ? 1 : 0;
      }else if (typeof val === 'boolean'){
        return val ? 1 : 0;
      }else {
        return null
      }
    }

    A(r, xar, laf, sf, v1){
      xar = this.__boolHelp(xar);
      laf = this.__boolHelp(laf);
      sf = this.__boolHelp(sf);
      if (r instanceof Vector && v1 instanceof Vector && xar != null && laf != null && sf != null){
        this.push(new CPoint(`A${r},${xar},${laf},${sf},${v1}`))
        return this
      }else{
        throw 'Error:\nA takes the parameters:\nr: Vector\nx-axis-rotation: Boolean (1,0)/(true,false)\nlarge-arc-flag: Boolean\nsweep-flag: Boolean\nv: Vector';
      }
    }
    a(r, xar, laf, sf, v1){
      xar = this.__boolHelp(xar);
      laf = this.__boolHelp(laf);
      sf = this.__boolHelp(sf);
      if (r instanceof Vector && v1 instanceof Vector && xar != null && laf != null && sf != null){
        this.push(new CPoint(`a${r},${xar},${laf},${sf},${v1}`))
        return this
      }else{
        throw 'Error:\na takes the parameters:\nr: Vector\nx-axis-rotation: Boolean (1,0)/(true,false)\nlarge-arc-flag: Boolean\nsweep-flag: Boolean\nv: Vector';
      }
    }

    C(v1, v2, v3){
      if (v1 instanceof Vector && v2 instanceof Vector && v3 instanceof Vector){
        this.push(new CPoint(`C${v1},${v2},${v3}`))
        return this
      }else{
        throw 'Error:\nC takes three vectors as its parameters';
      }
    }
    c(v1, v2, v3){
      if (v1 instanceof Vector && v2 instanceof Vector && v3 instanceof Vector){
        this.push(new CPoint(`c${v1},${v2},${v3}`))
        return this
      }else{
        throw 'Error:\nc takes three vectors as its parameters';;
      }
    }

    Z(){
      this.push(new CPoint(`Z`))
      return this
    }

  set d_string(string){
    if (typeof string !== 'string'){
      throw `Error setting d:\nd must be set to a string, not ${typeof string}`
      return
    }
    this.clear()
    //Remove white space
    let cmds = string.replace(/(\n|\t|\r)/g, '');

    //Add split markers
    cmds = cmds.replace(/(M|m|L|l|H|h|V|v|Z|z|C|c|S|s|Q|q|T|t|A|a)/g, '\n$&');
    cmds = cmds.slice(1);
    //Split
    cmds = cmds.split('\n');


    cmds.forEach((cmd) => {
      this.push(new CPoint(cmd));
    });
  }

  makeAbsolute(){
    let last = this.start.p;
    this.forEach((point) => {
      if (point.cmd_type == 'V'){
        point.x = last.x;
      }
      if (point.cmd_type == 'H'){
        point.y = last.y;
      }
      if (point.isAbsolute()){
        last = point.p;
      }else{
        point.add(last);
        point.cmd_type = point.cmd_type.toUpperCase();
        last = point.p;
      }
    });
  }

  makeRelative(){
    this.makeAbsolute();
    let cur = this.end;
    while (cur != this.start){
      cur.sub(cur.last.p);
      cur.cmd_type = cur.cmd_type.toLowerCase();
      cur = cur.last;
    }
  }

  toString(){
    let str = ''
    if (this.end == null) {return str}
    this.forEach((item) => {
      str += `${item}`
    });
    return str
  }
}

class SvgEllipse{
  constructor(el){
    this._co_labels = ['cx', 'cr'];

  }

  set r(val){
    let r = new Vector(val)

    this.el.setProps({
      rx: r.x,
      ry: r.y,
    })
  }

  set add(val){
    this.pos = this.pos.add(val);
  }
  set sub(val){
    this.pos = this.pos.sub(val);
  }
}























class ZoomAndPan{
  constructor(svg){
    if (svg instanceof SvgElement){
      this.svg = svg;
    }else{
      this.svg = new SvgElement(svg);
    }
    this.box = this.svg.parent;

    this.box.style = {
      overflow:'hidden'
    }
    this.pan_mode = 'double'
    this.unit = 'px';
    this.margin_default = 500;
    this.size_default = 600;

    this.center();

    this.box.addEventListener('wheel', (e) => {
      e.preventDefault()
      this.zoom(e.deltaY/50, new Vector(e));
    })

    this.mouse_down = false;
    this.box.addEventListener('mousedown', () => {
      setTimeout(() => {
        this.mouse_down = true;
      }, 20) //Bounce delay
    })
    this.box.addEventListener('mousemove', (e) => {
      if (this.mouse_down){
        this.pan(new Vector(e, {x: 'movementX', y: 'movementY'}))
      }
    })
    document.addEventListener('mouseup', () => {
      this.mouse_down = false;
    })

    this.last_touch = null;
    this.zoom_mode =false;
    this.last_mid = null;
    this.box.addEventListener('touchstart', (e) => {
      this.last_touch = new Vector(e.touches[0], {x: 'clientX', y: 'clientY'});
      if (e.touches.length == 2){
        let t1 = new Vector(e.touches[0], {x: 'clientX', y: 'clientY'})
        let t2 = new Vector(e.touches[1], {x: 'clientX', y: 'clientY'})
        this.last_mid = t1.add(t2).div(2);
      }
    })
    this.box.addEventListener('touchmove', (e) => {

      let t1 = new Vector(e.touches[0], {x: 'clientX', y: 'clientY'})

      if(e.touches.length == 2){
        this.zoom_mode = true;
        e.preventDefault();
        let t2 = new Vector(e.touches[1], {x: 'clientX', y: 'clientY'})

        if (this.last_pinch_zoom == null){
          this.last_pinch_zoom = t1.dist(t2);
        }
        let pinch_dist = t1.dist(t2);
        let delta = (pinch_dist - this.last_pinch_zoom)*this.size/this.size_default;
        this.last_pinch_zoom = pinch_dist;
        let mid = t1.add(t2).div(2);
        let delta_p = mid.sub(this.last_mid);
        // alert(delta_p.norm())
        // if (delta_p.norm() < 50){
          this.pan(mid.sub(this.last_mid));
        // }
        this.last_mid = mid;
        this.zoom(delta, mid)

      }else if (!this.zoom_mode && this.pan_mode == 'single'){
        let delta = t1.sub(this.last_touch);
        this.last_touch = t1;
        this.pan(delta)
        this.last_pinch_zoom = null;
      }
    })
    this.box.addEventListener('touchend', (e)=> {
      this.last_pinch_zoom = null;
      if ( e.touches.length == 0){
        this.zoom_mode = false;
      }
    })

  }

  center(){
    this.svg.el.scrollIntoView({block: 'center', inline: 'center'})
  }

  set margin_default(val){
    val = parseFloat(val);
    if (Number.isNaN(val)){
      throw 'Error setting margin_default:\n Must set to a number or string representing a number'
      return
    }
    this._margin_default = val;
    this.margin = val;
  }
  get margin_default(){return this._margin_default}

  set size_default(val){
    val = parseFloat(val);
    if (Number.isNaN(val)){
      throw 'Error setting size_default:\n Must set to a number or string representing a number'
      return
    }
    this._size_default = val;
    this.size = val;
  }
  get size_default(){return this._size_default}

  set margin(val){
    val = parseFloat(val);
    if (Number.isNaN(val)){
      throw 'Error setting margin:\n Must set to a number or string representing a number'
      return
    }
    this.svg.style = {
      margin: `${val}${this.unit}`
    }
    this._margin = val;
  }
  get margin(){
    return this._margin
  }

  set size(val){
    val = parseFloat(val);
    if (Number.isNaN(val)){
      throw 'Error setting size:\n Must set to a number or string representing a number'
      return
    }
    this.svg.style = {
      width: `${val}${this.unit}`
    }
    this._size = val;
  }
  get size(){
    return this._size;
  }

  get svg_pos(){
    return new Vector(this.svg.el.getBoundingClientRect());
  }

  get scroll_pos(){
    return new Vector(this.box.el, {x: 'scrollLeft', y: 'scrollTop'});
  }
  set scroll_pos(new_s){
    // console.log(new_s);
    // this.svg.pos = new_s
    // alert('x')
    this.box.el.scrollTo(new_s.x, new_s.y);
  }

  zoom(delta, pos){
    let _pos = pos.sub(this.svg_pos);
    let delta_scroll = _pos.mul( ((this.size + delta)/this.size - 1) );

    let new_scroll = this.scroll_pos.add(delta_scroll);

    this.size += delta
    this.scroll_pos = new_scroll;
  }

  pan(delta){
    this.scroll_pos = this.scroll_pos.sub(delta)
  }
}
