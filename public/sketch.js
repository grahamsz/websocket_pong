let myp5 = new p5((sketch) => {
  sketch.preload = () => {
    this.theShader = sketch.loadShader("shader.vert", "shader.frag");

    sketch.bounceSound = sketch.loadSound("sounds/bounce.mp3");
    sketch.winSound = sketch.loadSound("sounds/win.mp3");
    sketch.loseSound = sketch.loadSound("sounds/lose.mp3");
  };
  
  
  sketch.setup = () => {
    sketch.createCanvas(400, 600, sketch.WEBGL);

    this.g = sketch.createGraphics(400, 600);

    // Server is a Cloudflare Durable Object running on an edge server somewhere
    sketch.connectWebsocket("wss://pongtest.grahamsz.workers.dev/websocket");

    this.gameState = new GameState();

    this.gameState.sketch = sketch;
  };

  sketch.draw = () => {
    this.gameState.moveMyPaddle(
      sketch.map(sketch.mouseX, 0, sketch.width, 0, 1, true)
    );
    this.gameState.tick();

    this.g.background(0, 30);
    this.g.fill(255, 0, 130);
    this.g.textSize(24);
    // center align text
    this.g.textAlign(sketch.CENTER, sketch.CENTER);
    this.g.text(this.gameState.player1.username, sketch.width / 2, 30);

    this.g.text(
      this.gameState.player2.username,
      sketch.width / 2,
      sketch.height - 30
    );
    this.g.rect(
      this.gameState.player1.displayPosition - this.gameState.paddleSize[0] / 2,
      this.gameState.paddleMargin,
      this.gameState.paddleSize[0],
      this.gameState.paddleSize[1]
    );
    this.g.rect(
      this.gameState.player2.displayPosition - this.gameState.paddleSize[0] / 2,
      sketch.height -
        this.gameState.paddleMargin -
        this.gameState.paddleSize[1],
      this.gameState.paddleSize[0],
      this.gameState.paddleSize[1]
    );
    this.g.circle(
      this.gameState.ballPosition[0],
      this.gameState.ballPosition[1],
      this.gameState.ballRadius
    );

    this.theShader.setUniform("p5Drawing", this.g);
    this.theShader.setUniform("width", sketch.width);
    sketch.shader(this.theShader);
    sketch.plane(0, 0, sketch.width, sketch.height);
  };

  messageReceived = (data) => {
    this.gameState.processWebsocketMessage(data);
  };

  sketch.mouseClicked = () => {
    this.gameState.mouseClicked();
  };
});
