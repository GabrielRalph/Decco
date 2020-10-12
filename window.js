class Templates{
  constructor(el){
    el.styles = {
      display: 'none'
    }
  }
  get names(){
    let names = []
    for (var i = 0; i < this.children.length; i++){
      names.push(this.children[i].id)
    }
    return names.sort()
  }

  appendTemplate(template){
    if (!(template instanceof Element)){
      throw '' + new PlusError('Template must be an Element')
    }
    //DUPLICATE
    if (template.id in this.children){
      throw '' + new PlusError(`${template.id} is already an ID for another template.`)
      return null;
    }

    //NO ID -> set to timestamp
    if (template.id == null){
      template.id = '' + new Date().valueOf();
      throw '' + new PlusError(`Template must have a unique id, ${template.id}.`);
    }

    this.appendChild(template)
  }
  removeTemplate(template){
    console.log(this.children);
    if (template instanceof Element && this.contains(template)){
      template.remove();
      return template
    }else if (typeof template == 'string' && template in this.children){
      template = this.children[template];
      template.remove();
      return template;
    }else{
      throw `no template`
    }
  }
}

class Window{
  constructor(el){
    el.setAttribute('class', 'window');
  }
  set template(val){
    if(val instanceof Element){
      this.appendChild(val);
      this._template = val;
    }else{
      throw '' + new PlusError('Template must be set to an element')
    }
  }
  get template(){
    return this._template;
  }
}
class Windows{
  constructor(el){

    //Get template from
    try{
      el.templates = SVGPlus.SVGElementToSVGPlusElement(el.children.templates);
    }catch(e){
      el.templates = el.createChild('DIV', {id: 'templates'});
    }
    el.templates.extend(Templates);

    let home_page = (window.location.href.split('#')[1] || '').replace('/', '') || 'home';
    el.current_window = el.createWindow(home_page)

    el.navigator = el.createChild('div');
    el.navigator.extend(Navigator);
  }

  get template_names(){
    return this.templates.names;
  }

  //Set the current_page to either a string (template ID) or Element Page,
  //Set options as element attributes:
  //  direction: 'left'|'right'|'up'|'down',
  //  duration: Number
  async goto(template){
    console.log(template);
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
          this.current_window.styles = {transform: translate2}
        }
        let translate1 = dir == 'right' || dir == 'down' ? `translate(${y1}%, 0%)` : `translate(0%, ${y1}%)`;
        new_window.styles = {transform: translate1}

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
    let new_window = this.createChild('div');
    new_window.extend(Window)
    console.log(this.templates);
    template = this.templates.removeTemplate(template);
    new_window.template = template;
    return new_window
  }
}
class Navigator{
  constructor(el){
    el.setAttribute('id', 'navigator')

    //On change event listner
    el.onchange = null;

    //Make positioner
    let position = el.createChild('div')

    //Make hider
    el.hider = position.createChild('H1');
    el.hider.innerHTML = '=';
    el.hider.onclick = () => {
      el.hide = !el.hide;
    }

    //Make table row for links
    el.links = position.createChild('TABLE').createChild('TR')


    //Setup hash change listners
    window.onhashchange = (e) => {
      let page_name = (e.newURL.split('#')[1].replace('/', '') || 'home');
      if (el.onchange instanceof Function){
        el.onchange(page_name);
      }
      if (el.windows instanceof Element){
        if (!el.hide) el.hide =true;

        el.windows.goto(page_name)
      }
    }

    window.onload = (e) => {
      let page_name = ((window.location.href.split('#')[1] || '').replace('/', '') || 'home');
      if (el.onchange instanceof Function){
        el.onchange(page_name);
      }
      if (el.windows instanceof Windows){
        if (!el.hide) el.hide = true;
        el.windows.goto(page_name)
      }
    }

    el.moving = false;
    el.hide = true;

    el.updateLinks();
  }

  get windows(){
    // console.log(this.parentNode);
    return this.parentNode;
  }

  addLink(name){
    let link = this.links.createChild("TD").createChild('a');
    link.setAttribute('href', `#/${name}`);
    link.innerHTML = name.replace('_', ' ');
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
      this.style.setProperty('transform', `translate(${val ? 100 - y : y}%, 0%)`)
      if (x < Math.PI){
        window.requestAnimationFrame(t);
      }else{
        this.style.setProperty('transform', `translate(${val ? 100:0}%, 0%)`)
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
