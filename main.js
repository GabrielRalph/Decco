const firebaseConfig = {
  apiKey: "AIzaSyDniS0prRjEmOyKbMd4jequo9gkwe2otKI",
  authDomain: "fashion-galetora.firebaseapp.com",
  databaseURL: "https://fashion-galetora.firebaseio.com",
  projectId: "fashion-galetora",
  storageBucket: "fashion-galetora.appspot.com",
  messagingSenderId: "469438762797",
  appId: "1:469438762797:web:759f543ce82183b9f04da4",
  measurementId: "G-Q7DJ37H3D0"
};

firebase.initializeApp(firebaseConfig);


class Template extends PlusElement{
  constructor(el){
    super(el);
  }
}
class Templates extends PlusElement{
  constructor(el){
    super(el);

  }
  get names(){
    let names = []
    for (var i = 0; i < this.children.length; i++){
      names.push(this.children[i].id)
    }
    return names.sort()
  }
  get children(){
    return this.el.children
  }
  appendTemplate(template){
    if (!(template instanceof Template)){
      template = new Template(template);
    }

    //DUPLICATE
    if (template.id in this.children){
      throw new PlusError(`${template.id} is already an ID for another template.`)
      return null;
    }

    //NO ID -> set to timestamp
    if (template.id == null){
      this.id = '' + new Date().valueOf();
      throw new PlusError(`Template must have a unique id, ${template.id}.`);
    }

    this.appendChild(template)
  }
  removeTemplate(template){
    if (template instanceof Template){
      template.remove();
      return template
    }else if (typeof template == 'string' && template in this.children){
      template = this.children[template];
      template.remove();
      if (!(template.svgPlus instanceof Template)){
        template = new Template(template)
      }else{
        template =template.svgPlus
      }
      return template
    }else{
      throw `no template`
    }
  }
}
class Window extends PlusElement{
  constructor(el){
    super(el);
    this.setAttribute('class', 'window');
    // this.style = {
    //   background: `#${Math.round(Math.random()*9)}${Math.round(Math.random()*9)}${Math.round(Math.random()*9)}`
    // }
  }
  set template(val){
    if(val instanceof Template){
      this.appendChild(val);
      this._template = val;
    }else{
      throw '' + new PlusError('type not of template')
    }
  }
  get template(){
    return this._template;
  }
}
class Windows extends PlusElement{
  constructor(el){
    super(el)

    //Get template from
    try{
      this.templates = new Templates(this.children.template)
    }catch(e){
      let templates = this.createChild('DIV', {id: 'templates'});
      this.templates = new Templates(template);
      throw e
    }

    let home_page = (window.location.href.split('#')[1] || '').replace('/', '') || 'home';
    console.log(home_page);
    this.current_window = this.createWindow(home_page)

    let nav = document.createElement('DIV');
    this.el.appendChild(nav);
    this.navigator = new Navigator(nav, this);
  }

  get children(){
    return this.el.children
  }

  get template_names(){
    return this.templates.names;
  }

  //Set the current_page to either a string (template ID) or Element Page,
  //Set options as element attributes:
  //  direction: 'left'|'right'|'up'|'down',
  //  duration: Number
  async goto(template){
    if (template == this.current_window.template || template == this.current_window.template.id){
      return null
    }
    let new_window = null;
    try{
      new_window = this.createWindow(template);
    }catch(e){
      throw e
      return null
    }
    //Wait for transition of elements
    new_window = await this.wave_transition(new_window);

    //Remove old window
    let old_window = this.current_window;
    old_window.remove();

    //Return old template to template folder
    let old_template = old_window.template;
    this.templates.appendTemplate(old_template);

    //Set current_window to new_window created
    this.current_window = new_window
    this.navigator.updateLinks()
  }


  wave_transition(new_window, options){
    return new Promise((resolve, reject) => {
      let dir = 'right';
      let duration = 300;
      //Options checking
      if (typeof options == 'object'){
        //Direction of transition, either from the 'left'|'right', or 'up'|'down'
        if ('direction' in options && ('right left up down').indexOf(options.direction) != -1){
          dir = options.direction;
        }
        //duration of the transition
        if ('duration' in options && typeof options.duration == 'number' && !Number.isNaN(options.duration)){
          duration = options.duration;
        }
      }

      let init_time = null;
      let t = (time) => {

        init_time = init_time == null?time:init_time;
        let x = (time - init_time)/duration;

        let y1 = (dir == 'right' || dir == 'down' ? 1 : -1) * 50*(1 + Math.cos(x));
        let y2 = y1 - (dir == 'right' || dir == 'down' ? 1 : -1)*100;

        if (this.current_window != null){
          let translate2 = dir == 'right' || dir == 'down' ? `translate(${y2}%, 0%)` : `translate(0%, ${y2}%)`;
          this.current_window.style = {transform: translate2}
        }
        let translate1 = dir == 'right' || dir == 'down' ? `translate(${y1}%, 0%)` : `translate(0%, ${y1}%)`;
        new_window.style = {transform: translate1}

        if (x < Math.PI){
          window.requestAnimationFrame(t);

        }else{
          resolve(new_window)
        }
      }
      window.requestAnimationFrame(t);
    })
  }

  createWindow(template){
    let new_window = new Window(document.createElement('div'));
    template = this.templates.removeTemplate(template);
    new_window.template = template;
    this.appendChild(new_window);
    return new_window
  }
}
class Navigator extends PlusElement{
  constructor(el, windows = null){
    super(el)
    this.setAttribute('id', 'navigator')

    //On change event listner
    this.onchange = null;

    //Make positioner
    let position = document.createElement('DIV');
    this.appendChild(position);

    //Make hider
    this.hider = document.createElement('H1');
    this.hider.innerHTML = '=';
    this.hider.onclick = () => {
      this.hide = !this.hide;
    }
    position.appendChild(this.hider);

    //Make table for links
    let table = document.createElement('TABLE');
    position.appendChild(table);

    //Make table row for links
    this.links = document.createElement('TR');
    table.appendChild(this.links);

    // Add windows
    if (windows instanceof Windows){
      this.windows = windows;
      this.pages = this.windows.template_el;
    }else{
      this.windows = null;
    }

    //Setup hash change listners
    window.onhashchange = (e) => {
      let page_name = (e.newURL.split('#')[1].replace('/', '') || 'home');
      if (this.onchange instanceof Function){
        this.onchange(page_name);
      }
      if (this.windows instanceof Windows){
        if (!this.hide) this.hide =true;
        this.windows.goto(page_name)
      }
    }
    window.onload = (e) => {
      let page_name = ((window.location.href.split('#')[1] || '').replace('/', '') || 'home');
      if (this.onchange instanceof Function){
        this.onchange(page_name);
      }
      if (this.windows instanceof Windows){
        if (!this.hide) this.hide = true;
        this.windows.goto(page_name)
      }
    }

    this.moving = false;
    this.hide = true;

    this.updateLinks();
  }

  addLink(name){
    let link_cell = document.createElement("TD");
    let link = document.createElement('A');

    link.setAttribute('href', `#/${name}`);
    link.innerHTML = name.replace('_', ' ');

    link_cell.appendChild(link)
    link_cell.setAttribute('width', '33%')
    this.links.appendChild(link_cell)
  }
  clearLinks(){
    this.links.innerHTML = '';
  }

  set hide(val = true){
    if (this.moving){
      return
    }
    this.moving = true;
    this._hide = val;
    let init_time = null;
    let t = (time) => {
      init_time = init_time == null?time:init_time;
      let x = (time - init_time)/300
      let y = 50*(1 + Math.cos(x));
      this.el.style.setProperty('transform', `translate(${val ? 100 - y : y}%, 0%)`)
      if (x < Math.PI){
        window.requestAnimationFrame(t);
      }else{
        this.el.style.setProperty('transform', `translate(${val ? 100:0}%, 0%)`)
        this.moving = false;
      }
    }
    window.requestAnimationFrame(t);
  }
  get hide(){
    return this._hide;
  }

  updateLinks(){
    this.clearLinks()
    let names = this.windows.templates.names;
    console.log(names);
    names.forEach((name) => {
      this.addLink(name)
    });

  }

}

// class WaveLoader extends PlusElement{
//   constructor(el){
//     super(el);
//
//
//     //Bounding box
//     this.style = {
//       position: 'fixed',
//       top: '-5px',
//       left: '-5px',
//       right: '-5px',
//       bottom: '-5px',
//       'z-index': '1000',
//     };
//
//     // Svg to contain wave
//     this.path = this.createChild('svg', {
//       viewBox: '-1 -2 8.3 4',
//       position: 'fixed',
//       top: '50%',
//       left: '50%',
//       style: {
//         transform: 'translate(-50%, -50%)',
//       }
//
//     // Wave path
//     }).createChild('path', {
//       fill: 'none',
//       'stroke-linecap': 'round',
//       'stroke-width': 0.4
//     })
//
//     //Main propertys
//     this.color = 'black'
//     this.background = 'white'
//
//     // Show on creation
//     this.hide = false;
//   }
//
//   //Setters and Getters for main properties
//   set background(color){
//     this.style = {
//       background: color
//     }
//   }
//   get background(){
//     return this.getProperty('color')
//   }
//
//   set color(color){
//     this.path.props = {
//       stroke: color
//     }
//   }
//   get color(){
//     return this.path.getAttribute('stroke');
//   }
//
//   //Wave animater frame function
//   __wave_animater(t0){
//     let x0 = t0/400;
//     this.path.clear();
//     let y = () => Math.sin(x) + Math.sin( Math.sin(x*5) + x );
//     this.path.M(new Vectror(y(x0)));
//     for(var x = 0; x < 2*Math.PI; x += 0.05){
//       this.path.L(new Vector(y(x)));
//     }
//   }
//
//   //Setters and Getters for wave loader states
//   set hide(val){
//     if (val && (!this._hide)){
//       this.style = {
//         display: 'none'
//       }
//       this.move = false;
//       this._hide = true;
//     }else if ((!val) && this._hide){
//       this.style = {
//         display: 'block'
//       }
//       this.move = true;
//       this._hide = false;
//     }
//   }
//   get hide(){
//     return this._hide
//   }
//
//   set move(val){
//     if (val){
//       let next = (t0) => {
//         this.__wave_animater(t0);
//         if (this._move){
//           window.requestAnimationFrame(next);
//         }
//       }
//       this._move = true;
//     }else{
//       this._move = false
//     }
//   }
//   get move(){
//     return this.move;
//   }
// }
//
