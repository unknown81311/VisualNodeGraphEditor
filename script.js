function drawRoundedRect(ctx, x, y, width, height, radius, corners = -1) {
    x--;
    y--;
    width += 2;
    height += 2;

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, (corners & 1) ? radius : 0);
    ctx.arcTo(x + width, y + height, x, y + height, (corners & 2) ? radius : 0);
    ctx.arcTo(x, y + height, x, y, (corners & 4) ? radius : 0);
    ctx.arcTo(x, y, x + width, y, (corners & 8) ? radius : 0);
    ctx.closePath();
    ctx.fill();
}


class Node {
  constructor(canvasManager, id, x, y, radius, color, type) {
    this.canvasManager = canvasManager;
    this.ctx = this.canvasManager.ctx;
    this.x = x;
    this.y = y;
    this.id = id;
    this.radius = radius;
    this.color = color;
    this.type = type;
    this.connectedNodes = [];
    this.isDragging = false;
    this.offsetX = 0;
    this.offsetY = 0;
  }

  handleMouseDown(event) {
    const mouseX = event.clientX;
    const mouseY = event.clientY;

    if (this.isHovered(mouseX, mouseY)) {
      this.isDragging = true;
      this.offsetX = mouseX - this.x;
      this.offsetY = mouseY - this.y;
      return true;
    }
    return false;
  }

  handleMouseMove(event) {
    this.canvasManager.pointer = true;

    if(this.canvasManager.dropDownMenu.isVisible) return;
    this.draw(this.x,this.y);
  }

  handleMouseUp(event) {
    if(!this.isDragging) return;
    this.isDragging = false;

    // Check if the mouse is hovering over another node
    const hoveredNode = this.canvasManager.nodes.find(node => node !== this && node.isHovered(event.clientX, event.clientY, 9));

    if (hoveredNode && this.isCompatibleWith(hoveredNode)) {

      const found = this.connectedNodes.findIndex(node => node.id === hoveredNode.id)!=-1||hoveredNode.connectedNodes.findIndex(node => node.id === this.id)!=-1;

      if (found) {
        if(this.type == "input")
          hoveredNode.unconnectToNode(this);
        else
          this.unconnectToNode(hoveredNode);
      } else {  // already connected, remove the connection
        if(this.type == "input")
          hoveredNode.connectToNode(this);
        else
          this.connectToNode(hoveredNode);
      }
      this.draw(this.x,this.y);
    }
  }

  isHovered(mouseX, mouseY, offsetR = 0) {
    const distance = Math.sqrt(Math.pow(mouseX - this.x, 2) + Math.pow(mouseY - this.y, 2));
    return distance <= this.radius + offsetR;
  }

  isCompatibleWith(otherNode) {
    return this.type !== otherNode.type; // Check if input and output types are different
  }

  unconnectToNode(index) {
    this.connectedNodes.splice(index, 1);
  }

  connectToNode(otherNode) {
    this.connectedNodes.push(otherNode);
  }

  draw(x, y, dontDrawCanvas) {
    if(!dontDrawCanvas)this.canvasManager.drawBlocks();
    this.x = x || this.x; // Save the x and y values
    this.y = y || this.y;

    if (this.isDragging) {
      this.ctx.beginPath();

      const hoveredNode = this.canvasManager.nodes.find(node => node !== this && node.isHovered(event.clientX, event.clientY, 9));
      this.ctx.moveTo(this.x, this.y);
      if(hoveredNode)
        this.ctx.lineTo(hoveredNode.x, hoveredNode.y);
      else
        this.ctx.lineTo(event.clientX, event.clientY);
      this.ctx.strokeStyle = this.color;
      this.ctx.stroke();
    }

    this.ctx.beginPath();
    this.ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
    this.ctx.fillStyle = this.color;
    this.ctx.fill();
    const defaultC = this.ctx.strokeStyle;
    this.ctx.strokeStyle = '#222222'; // Set the stroke color
    this.ctx.lineWidth = 2; // Set the stroke width
    this.ctx.stroke();
    this.ctx.strokeStyle = defaultC;
    this.ctx.lineWidth = 0; // Set the stroke width

    this.drawConnections();

  }

  drawConnections() {
    this.connectedNodes.forEach(connectedNode => {
      this.ctx.beginPath();
      this.ctx.moveTo(this.x, this.y);

      const deltaX = connectedNode.x - this.x;
      const deltaY = connectedNode.y - this.y;

      const controlX1 = this.x + Math.abs(deltaX) * 0.25 * (this.x < connectedNode.x ? 1 : -1);
      const controlY1 = this.y;

      const controlX2 = this.x + Math.abs(deltaX) * 0.75 * (this.x < connectedNode.x ? 1 : -1);
      const controlY2 = connectedNode.y;

      this.ctx.bezierCurveTo(controlX1, controlY1, controlX2, controlY2, connectedNode.x, connectedNode.y);

      this.ctx.strokeStyle = this.color;
      this.ctx.stroke();
    });
  }
}


class Button {
  constructor(label, id, action, ctx, ...args) {
    this.label = label;
    this.action = action;
    this.ctx = ctx;
    this.x = 0; // Initialize x and y to 0
    this.y = 0;
    this.id = id;
    this.args = args;
  }

  activate() {
    this.action(...this.args);
  }

  draw(x, y) {
    this.x = x; // Save the x and y values
    this.y = y;

    const textWidth = this.ctx.measureText(this.label).width;

    // Draw the button background
    this.ctx.fillStyle = "#ddd";
    drawRoundedRect(this.ctx, this.x, this.y, textWidth + 10, 20, 2);

    // Draw the button text
    this.ctx.fillStyle = "#000";
    this.ctx.font = "12px Arial";
    this.ctx.fillText(this.label, this.x + 5, this.y + 15);
  }

  isHovered(mouseX, mouseY) {
    const textWidth = this.ctx.measureText(this.label).width;
    const valid =
      mouseX >= this.x &&
      mouseX <= this.x + textWidth + 10 &&
      mouseY >= this.y &&
      mouseY <= this.y + 20;

    return valid;
  }
}


class Block {
  constructor(canvasManager, ctx, x, y, width, height, color, headerColor, text) {
    this.canvasManager = canvasManager;
    this.id = ++this.canvasManager.highestID;
    this.ctx = ctx;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;
    this.headerColor = headerColor;
    this.text = text;
    this.buttons = [];

    this.isSelected = false;
    this.nodes = [];
  }

  addButton(label, action, ...args) {
    this.canvasManager.highestID++;
    const button = new Button(label, this.canvasManager.highestID, action, this.ctx, ...args);
    this.buttons.push(button);
  }

  draw() {
    // Draw the block with a shadow
    this.ctx.shadowColor = "rgba(0, 0, 0, 0.3)"; // Shadow color
    this.ctx.shadowBlur = 5; // Shadow blur radius
    this.ctx.shadowOffsetX = 3; // Shadow offset in the X direction
    this.ctx.shadowOffsetY = 3; // Shadow offset in the Y direction

    this.ctx.fillStyle = this.color;
    drawRoundedRect(this.ctx,this.x, this.y, this.width, this.height, 5);
    if(this.isSelected){
      this.ctx.lineWidth = 4;
      this.ctx.strokeStyle = "rgba(80, 188, 255, 0.3)";
      this.ctx.stroke();
      this.ctx.lineWidth = 0;
    }

    // Draw the block header
    this.ctx.fillStyle = this.headerColor;
    drawRoundedRect(this.ctx,this.x, this.y, this.width, 30, 5, 9);
    //this.ctx.fillRect(this.x, this.y, this.width, 30);

    if(this.isSelected){
      let o = this.ctx.strokeStyle;
      this.ctx.lineWidth = 2;
      this.ctx.strokeStyle = "rgba(80, 188, 255, 0.3)";
      this.ctx.stroke();
      this.ctx.lineWidth = 0;
      this.ctx.strokeStyle = o;
    }

    // Draw the block text
    this.ctx.fillStyle = "#000";
    this.ctx.font = "12px Arial";
    this.ctx.fillText(this.text, this.x + 10, this.y + 20);

    // Draw buttons in the content area
    let buttonOffsetY = 40;
    this.buttons.forEach((button) => {
      button.draw(this.x + 10, this.y + buttonOffsetY);
      buttonOffsetY += 25;
    });

    // Reset shadow after drawing the block
    this.ctx.shadowColor = "transparent";
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;

    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      const nodeX = this.x + (node.type === "input" ? 0 : this.width); // Adjust based on type
      const nodeY = this.y + 50 + i * 25; // Adjust based on index
      node.draw(nodeX, nodeY, true);
    }
  }

  isHovered(mouseX, mouseY) {
    return (
      mouseX >= this.x &&
      mouseX <= this.x + this.width &&
      mouseY >= this.y &&
      mouseY <= this.y + this.height
    );
  }

  isInHeader(mouseY) {
    return mouseY <= this.y + 30;
  }


  isButtonHovered(mouseX, mouseY) {
    for (let i = 0; i < this.buttons.length; i++) {
      const button = this.buttons[i];
      if (button.isHovered(mouseX, mouseY)) {
        return button;
      }
    }
    return null;
  }

  addNode(type) {
    const nodeRadius = 6;
    const nodeColor = type === 'input' ? 'blue' : 'red';
    const nodeY = this.y + this.height / 2; // Center the node vertically

    if (type === 'input') {
      // Add an input node to the left side
      const nodeX = this.x - 30 - this.nodes.filter(node => node.type === 'input').length * 30;
      this.canvasManager.highestID++;
      const node = new Node(this.canvasManager, this.canvasManager.highestID, nodeX, nodeY, nodeRadius, nodeColor, type);
      this.nodes.push(node);
      this.canvasManager.nodes.push(node);
    } else {
      // Add an output node to the right side
      const nodeX = this.x + this.width + 30 + this.nodes.filter(node => node.type === 'output').length * 30;
      this.canvasManager.highestID++;
      const node = new Node(this.canvasManager, this.canvasManager.highestID, nodeX, nodeY, nodeRadius, nodeColor, type);
      this.nodes.push(node);
      this.canvasManager.nodes.push(node);
    }
  }
}

class ContextMenuManager {
  constructor(canvasManager) {
    this.canvasManager = canvasManager;
    this.buttons = [];
    this.isVisible = false;
  }

  showMenu(x, y) {
    this.isVisible = true;

    // Set the position of the context menu
    this.x = x;
    this.y = y;

    // Draw the context menu
    this.draw();
  }

  hideMenu() {
    this.isVisible = false;
    this.draw(); // Clear the context menu
  }

  addButton(label, callback, ...args) {
    this.canvasManager.highestID++;
    const button = new Button(label, this.canvasManager.highestID, callback, this.canvasManager.ctx, ...args);
    this.buttons.push(button);
  }

  removeButton(label) {
    const index = this.buttons.findIndex((button) => button.label === label);
    if (index !== -1) {
      this.buttons.splice(index, 1);
    }
  }

  removeAllButtons() {
    this.buttons = [];
  }

  draw(event) {
    if (!this.isVisible) {
      // Clear the context menu
      this.canvasManager.ctx.clearRect(0, 0, this.canvasManager.canvas.width, this.canvasManager.canvas.height);
      return;
    }

    // Draw the context menu background with shadow
    this.canvasManager.ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
    this.canvasManager.ctx.shadowBlur = 5;
    this.canvasManager.ctx.shadowOffsetX = 3;
    this.canvasManager.ctx.shadowOffsetY = 3;

    this.canvasManager.ctx.fillStyle = "#f0f0f0";
    drawRoundedRect(this.canvasManager.ctx, this.x, this.y, 100, this.buttons.length * 30 + 10, 5);

    // Reset shadow after drawing the context menu background
    this.canvasManager.ctx.shadowColor = "transparent";
    this.canvasManager.ctx.shadowBlur = 0;
    this.canvasManager.ctx.shadowOffsetX = 0;
    this.canvasManager.ctx.shadowOffsetY = 0;

    // Draw the buttons in the context menu with shadow
    let offsetY = this.y + 10;
    this.buttons.forEach((button) => {
      this.canvasManager.ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
      this.canvasManager.ctx.shadowBlur = 5;
      this.canvasManager.ctx.shadowOffsetX = 3;
      this.canvasManager.ctx.shadowOffsetY = 3;

      button.draw(this.x + 10, offsetY);
      offsetY += 30;

      // Reset shadow after drawing each button
      this.canvasManager.ctx.shadowColor = "transparent";
      this.canvasManager.ctx.shadowBlur = 0;
      this.canvasManager.ctx.shadowOffsetX = 0;
      this.canvasManager.ctx.shadowOffsetY = 0;

    });
  }

  isButtonHovered(mouseX, mouseY) {
    for (let i = 0; i < this.buttons.length; i++) {
      const button = this.buttons[i];
      if (button.isHovered(mouseX, mouseY)) {
        return button;
      }
    }
    return null;
  }
}


class CanvasManager {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    this.blocks = [];
    this.highestID = 0;
    this.draggedBlock = null;
    this.offsetX = 0;
    this.offsetY = 0;

    this.nodes = [];
    this.cursor = 0;

    this.selection = {
      active: false,
      startX: 0,
      startY: 0,
      endX: 0,
      endY: 0,
      selectedBlocks: [],
    };

    this.dropDownMenu = new ContextMenuManager(this);

    this.setupCanvas();
    this.setupListeners();
  }

  deleteBlock(block) {
    const index = this.blocks.findIndex(existingBlock => existingBlock.id === block.id);
    if (index !== -1) {
      // remove node connections
      block.nodes.forEach((node, nodeI) => {
        this.nodes.forEach((otherNode, oNodeI) => {
          if (otherNode.connectedNodes.includes(node)) {
            
            otherNode.unconnectToNode(node);
          }
          if(node.id==otherNode.id)
            this.nodes.splice(this.nodes.indexOf(otherNode), 1);
        });
      });

      this.blocks.splice(index, 1);
      this.drawBlocks();
    } else {
      alert("Error: Can't find block");
    }
  }

  setupCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  setupListeners() {
    this.canvas.addEventListener("contextmenu", this.handleContextMenu.bind(this));
    this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
    this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
    this.canvas.addEventListener("mouseup", this.handleMouseUp.bind(this));
    document.addEventListener("keydown", this.handlekeyDown.bind(this));
  }

  handlekeyDown(event) {
    console.log(event.key)
    if(event.key == "a") {
      this.selection.selectedBlocks = this.blocks;
      this.selection.selectedBlocks.forEach(blk => blk.isSelected = true);
      this.drawBlocks();
    }
    if(event.key == "Backspace") {
      this.blocks = [];
      this.drawBlocks();
    }
  }

  handleContextMenu(event) {
    event.preventDefault();
    const isHoveringAny = false;

    const mouseX = event.clientX;
    const mouseY = event.clientY;

    for (let i = this.blocks.length - 1; i >= 0; i--) { // dont create new
      const block = this.blocks[i];
      if (block.isHovered(mouseX, mouseY)) {
        return;
      }
    }

    const newBlock = new Block(
      this,
      this.ctx,
      mouseX - 50,
      mouseY - 50,
      200,
      100,
      "#f0f0f0",
      "#ddd",
      "Block Text"
    );

    newBlock.addButton("Button 1", () => alert("Button 1 clicked!"));
    newBlock.addButton("Button 2", () => alert("Button 2 clicked!"));

    newBlock.addNode("input");
    newBlock.addNode("output");

    this.blocks.push(newBlock);

    this.drawBlocks();
  }

  handleMouseMove(event) {
    event.preventDefault();

    if (this.selection.active) {
      this.selection.endX = event.clientX;
      this.selection.endY = event.clientY;
    }

    for (var i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i]
      node.handleMouseMove(event);
    }

    if(this.draggedBlock && this.selection.selectedBlocks.length!=0 && this.selection.selectedBlocks.findIndex(b=>b.id==this.draggedBlock.id)!=-1){// drag multiple blocks
      for (var i = this.selection.selectedBlocks.length - 1; i >= 0; i--) {
        this.selection.selectedBlocks[i].x += event.movementX;
        this.selection.selectedBlocks[i].y += event.movementY;
      }
      this.drawBlocks();

    } else if (this.draggedBlock) {
      if(this.selection.active){
        this.selection.active = false;
        this.selection.selectedBlocks.forEach(blk=>blk.isSelected=false);
        this.selection.selectedBlocks = [];
      }
      this.draggedBlock.x += event.movementX;
      this.draggedBlock.y += event.movementY;
      this.drawBlocks();

    } else {

      const {
        block,
        isOverHeader
      } = this.isHoverBlock(event.clientX, event.clientY);

      this.cursor = isOverHeader?1:0;

      if (block && block.isButtonHovered(event.clientX, event.clientY))
        this.cursor = 1

    }
    if (this.dropDownMenu.isVisible) {

      // Check if the mouse is still inside the context menu
      if (!(
              event.clientX >= this.dropDownMenu.x &&
              event.clientX <= this.dropDownMenu.x + 100 &&
              event.clientY >= this.dropDownMenu.y &&
              event.clientY <= this.dropDownMenu.y + this.dropDownMenu.buttons.length * 30 + 10)
      ) {
        this.dropDownMenu.hideMenu();
        this.drawBlocks(); // Redraw the canvas after hiding the context menu
      }

      for (let i = this.dropDownMenu.buttons.length - 1; i >= 0; i--) { // dont create new
        const button = this.dropDownMenu.buttons[i];
        this.cursor = button.isHovered(event.clientX, event.clientY)?1:0;
      }

    }
    document.body.style.cursor = this.cursor==0 ? "default" : this.cursor==1 ? "pointer" : "move" ;
  }

  handleMouseDown(event) {
    event.preventDefault();
    let nodePressed = false;
    for (var i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i]
      nodePressed = nodePressed || node.handleMouseDown(event);
    }

    const mouseX = event.clientX;
    const mouseY = event.clientY;

    const {
      block,
      isOverHeader
    } = this.isHoverBlock(mouseX, mouseY);

    if (event.button === 0 && !block && !nodePressed) {//LMB
      // Left mouse button clicked on empty space, start selection
      if(this.selection.active){
        this.selection.active = false;
      } else {
        this.selection.active = true;
        this.selection.startX = event.clientX;
        this.selection.startY = event.clientY;
        this.selection.endX = event.clientX;
        this.selection.endY = event.clientY;
      }
      this.selection.selectedBlocks.forEach(blk=>blk.isSelected=false);
      this.selection.selectedBlocks = [];
    }


    if (this.dropDownMenu.isVisible) {
      let ddButton = this.dropDownMenu.isButtonHovered(mouseX, mouseY);
      if (ddButton) {
        ddButton.activate(); // Call the activate method to execute the action with arguments
        this.dropDownMenu.hideMenu();
        this.drawBlocks();
      }
      return; // Don't proceed with the rest of the method if the button is clicked
    }


    if (event.button == 2 && isOverHeader) {
      // right click
      this.dropDownMenu.removeAllButtons();
      this.dropDownMenu.addButton("Delete this", (blk) => {
        this.deleteBlock(blk);
        this.dropDownMenu.hideMenu();
        this.drawBlocks();
      }, block);
      this.dropDownMenu.showMenu(mouseX - 5, mouseY - 5);
    } else {
      if (block) {
        if (isOverHeader) {
          this.draggedBlock = block;
          this.offsetX = mouseX - block.x;
          this.offsetY = mouseY - block.y;

          this.blocks.splice(this.blocks.indexOf(block), 1);
          this.blocks.push(this.draggedBlock);
          
          this.cursor = 2;
          document.body.style.cursor = "move";
          
          this.drawBlocks();
        }

        const clickedButton = block.isButtonHovered(mouseX, mouseY);
        if (clickedButton) {
          clickedButton.activate();
        }
      }
    }
  }


  isBlockInSelection(block) {
    const blockX = block.x;
    const blockY = block.y;
    const blockWidth = block.width;
    const blockHeight = block.height;

    const minX = Math.min(this.selection.startX, this.selection.endX);
    const minY = Math.min(this.selection.startY, this.selection.endY);
    const maxX = Math.max(this.selection.startX, this.selection.endX);
    const maxY = Math.max(this.selection.startY, this.selection.endY);

    return (
      blockX < maxX &&
      blockX + blockWidth > minX &&
      blockY < maxY &&
      blockY + blockHeight > minY
    );
  }

  drawSelectionArea() {
    if (this.selection.active) {
      // Draw selection area
      this.ctx.fillStyle = "rgba(135, 206, 250, 0.3)"; // LightBlue with 30% opacity
      this.ctx.strokeStyle = "rgba(80, 188, 255, 0.3)"; // LightBlue with 30% opacity

      const x = Math.min(this.selection.startX, this.selection.endX);
      const y = Math.min(this.selection.startY, this.selection.endY);
      const width = Math.abs(this.selection.endX - this.selection.startX);
      const height = Math.abs(this.selection.endY - this.selection.startY);


      this.ctx.rect(x, y, width, height);
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.fillStyle = "rgba(0,0,0,0)";
      this.ctx.strokeStyle = "rgba(0,0,0,0)";
    }
  }

  handleMouseUp(event) {
    if (this.selection.active) {
      // Selection completed, find and store selected blocks
      this.selection.selectedBlocks = this.blocks.filter((block) =>
        this.isBlockInSelection(block)
      );
      this.selection.selectedBlocks.forEach(blk => blk.isSelected = true);

      this.selection.active = false;
      //this.drawSelectionArea();
    }

    for (var i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i]
      node.handleMouseUp(event);
    }
    this.draggedBlock = null;
    document.body.style.cursor = "default";
    if (this.dropDownMenu.isVisible)
      this.dropDownMenu.draw();
  }

  isHoverBlock(mouseX, mouseY) {
    for (let i = this.blocks.length - 1; i >= 0; i--) {
      const block = this.blocks[i];
      if (block.isHovered(mouseX, mouseY)) {
        const isOverHeader = block.isInHeader(mouseY);
        return {
          block,
          isOverHeader
        };
      }
    }
    return {
      block: null,
      isOverHeader: false
    };
  }

  drawBlocks() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawSelectionArea();
    this.blocks.forEach((block) => {
      block.draw(this.ctx);
    });
  }
}

// Create an instance of CanvasManager with the canvas ID
const canvasManager = new CanvasManager("myCanvas");