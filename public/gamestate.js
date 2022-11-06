// This is game state object

class GameState {
  constructor() {
    this.player1 = {}; //top of coordinate space (but can transform)
    this.player2 = {}; //bottom of coordinate space

    this.player1.username = "[Not connected]";
    this.player2.username = "[Not connected]";
    this.player1.hasBall = 1;
    this.player2.hasBall = 0;

    this.ballPosition = [0, 0]; // x,y
    this.ballVelocity = [0, 0]; // x,y

    this.myPlayer = {}; // copy of the object
    this.otherPlayer = {}; // copy of the object

    this.ballRadius = 20;
    this.boardSize = [400, 600];
    this.paddleSize = [60, 10];
    this.paddleMargin = 45; // from edge of board

    this.status = 0; //0 = waiting to play, 1 = play, 2 = lost ball
    this.lastSentPosition = 0;
    this.lastUpdate = 0;
    this.lastRoundEndedMillis = 0;
    this.sketch = {};
  }

  processWebsocketMessage(data) {
    //  console.log(data);
    if (data.msgType == "WELCOME") {
      this.myPlayer = {};
      this.myPlayer.username = data.username;
      this.myPlayer.hasBall = data.hasBall;

      if (this.myPlayer.username == "Player 1") {
        this.player1 = this.myPlayer;
        this.otherPlayer = this.player2;
      }
      if (this.myPlayer.username == "Player 2") {
        this.player2 = this.myPlayer;
        this.otherPlayer = this.player1;
      }
    } else var affectedPlayer = this.player1;
    if (data.username == "Player 2") {
      affectedPlayer = this.player2;
    }

    if (data.msgType == "PADDLE_MOVE") {
      affectedPlayer.username = data.username;
      affectedPlayer.position = data.position;
      if (!affectedPlayer.displayPosition) {
        affectedPlayer.displayPosition = data.position;
      }
      affectedPlayer.hasBall = data.hasBall;
    }

    if (data.msgType == "BALL_BOUNCE") {
      this.ballPosition = data.position;
      this.ballVelocity = data.velocity;
      this.player1.hasBall = 0;
      this.player2.hasBall = 0;
      this.sketch.bounceSound.play();
    } else {
      // console.log(data);
    }
  }

  tick() {
    if (this.sketch.millis() - this.lastUpdate > 100) {
      // console.log(this.player1);

      if (this.lastSentPosition != this.myPlayer.position) {
        this.lastUpdate = this.sketch.millis();
        this.lastSentPosition = this.myPlayer.position;
        this.sketch.sendMessage({
          msgType: "PADDLE_MOVE",
          position: this.myPlayer.position,
          hasBall: this.myPlayer.hasBall,
        });
      }
    }

    if (this.otherPlayer.displayPosition) {
      this.otherPlayer.displayPosition = this.sketch.lerp(
        this.otherPlayer.displayPosition,
        this.otherPlayer.position,
        0.3
      );
    }

    if (this.player1.hasBall) {
      this.ballPosition[0] = this.player1.displayPosition;
      this.ballPosition[1] = this.paddleMargin + this.ballRadius + 5;
    } else if (this.player2.hasBall) {
      this.ballPosition[0] = this.player2.displayPosition;
      this.ballPosition[1] =
        this.boardSize[1] - this.paddleMargin - this.ballRadius - 5;
    } else if (this.status < 3) {
      this.ballPosition[0] += this.ballVelocity[0];
      this.ballPosition[1] += this.ballVelocity[1];

      // now test if we bounce of the edges

      if (
        this.ballPosition[0] < this.ballRadius ||
        this.ballPosition[0] > this.boardSize[0] - this.ballRadius
      ) {
        this.ballVelocity[0] *= -1;
        if ((this.ballPosition[1]>0) && (this.ballPosition[1]<this.sketch.height) )
            {
                  this.sketch.bounceSound.play();
          }
        ///  this.sketch.sendMessage({ msgType: "BALL_BOUNCE", hit: true, position: this.ballPosition, velocity: this.ballVelocity });
      }

      // now test if we bounce off my players paddle, we'll trust the other player is honorable
      if (this.status < 2) {
        if (
          this.ballPosition[0] >=
            this.myPlayer.position - this.paddleSize[0] / 2 &&
          this.ballPosition[0] <=
            this.myPlayer.position + this.paddleSize[0] / 2
        ) {
          if (this.myPlayer == this.player1) {
            // Player 1 has the top of the field

            if (
              this.ballPosition[1] < this.paddleMargin + this.ballRadius &&
              this.ballPosition[1] - this.ballVelocity[1] >
                this.paddleMargin + this.ballRadius
            ) {
              {
                // bounced of the top paddle
                var intersectionX = this.sketch.map(
                  this.paddleMargin + this.ballRadius,
                  this.ballPosition[1] - this.ballVelocity[1],
                  this.ballPosition[1],
                  this.ballPosition[0] - this.ballVelocity[0],
                  this.ballPosition[0]
                );
                this.ballPosition = [
                  intersectionX,
                  this.paddleMargin + this.ballRadius,
                ];
                this.ballVelocity[1] = Math.abs(this.ballVelocity[1]);
                console.log(
                  "Bounce off top paddle new velo is " + this.ballVelocity[1]
                );
                 this.sketch.bounceSound.play();
                this.sketch.sendMessage({
                  msgType: "BALL_BOUNCE",
                  hit: true,
                  position: this.ballPosition,
                  velocity: this.ballVelocity,
                });
              }
            }
          } else {
            // Player2 has the bottom
            if (
              this.ballPosition[1] >
                this.sketch.height - this.paddleMargin - this.ballRadius &&
              this.ballPosition[1] - this.ballVelocity[1] <
                this.sketch.height - this.paddleMargin - this.ballRadius
            ) {
              // bounced of the bottom paddle
              var intersectionX = this.sketch.map(
                this.sketch.height - this.paddleMargin - this.ballRadius,
                this.ballPosition[1] - this.ballVelocity[1],
                this.ballPosition[1],
                this.ballPosition[0] - this.ballVelocity[0],
                this.ballPosition[0]
              );
              this.ballVelocity[1] = -Math.abs(this.ballVelocity[1]);
              this.ballPosition = [
                intersectionX,
                this.sketch.height - this.paddleMargin - this.ballRadius,
              ];
              console.log("Bounce off bottom paddle");
              this.sketch.bounceSound.play();
              this.sketch.sendMessage({
                msgType: "BALL_BOUNCE",
                hit: true,
                position: this.ballPosition,
                velocity: this.ballVelocity,
              });
            }
          }
        }
      }
      if (
        this.status < 3 &&
        (this.ballPosition[1] > this.sketch.height + 120 ||
          this.ballPosition[1] < -120)
      ) {
        console.log("lost ball at " + this.ballPosition);
        
        if (this.myPlayer==this.player1)
        {
          if (this.ballPosition[1]>0)
            {
              this.sketch.winSound.play();
            }
          else
            {
              this.sketch.loseSound.play();
            }
        }
        if (this.myPlayer==this.player2)
        {
          if (this.ballPosition[1]>0)
            {
              this.sketch.loseSound.play();
            }
          else
            {
              this.sketch.winSound.play();
            }
        }
        // we have lost the ball
        //   this.status=0;
        this.status = 3;
        this.lastRoundEndedMillis = this.sketch.millis();

        //                this.sketch.sendMessage({ msgType: "BALL_BOUNCE", hit: false, position: this.ballPosition, velocity: this.ballVelocity });
      }
    }

    if (
      this.status == 3 &&
      this.sketch.millis() - this.lastRoundEndedMillis > 500
    ) {
      if (this.ballPosition[1] > this.sketch.height - this.paddleMargin) {
        this.status = 0;
        this.player1.hasBall = 1;
      } else {
        this.status = 0;
        this.player2.hasBall = 1;
        console.log("giving player2 the ball");
      }
    }
  }

  moveMyPaddle(
    x // x should be scaled from 0 to 1
  ) {
    this.myPlayer.position = this.sketch.map(
      x,
      0,
      1,
      this.paddleSize[0] / 2,
      this.boardSize[0] - this.paddleSize[0] / 2
    );
    this.myPlayer.displayPosition = this.myPlayer.position;
  }
  mouseClicked() {
    // relase the ball
    if (this.myPlayer.hasBall) {
      this.status = 1;
      this.myPlayer.hasBall = false;
      this.ballVelocity[0] = this.sketch.random(-5, 5);
      if (this.myPlayer == this.player1) {
        this.ballVelocity[1] = this.sketch.random(2, 3);
      } else {
        this.ballVelocity[1] = this.sketch.random(-2, -3);
      }
      this.sketch.bounceSound.play();
      this.sketch.sendMessage({
        msgType: "BALL_BOUNCE",
        hit: true,
        position: this.ballPosition,
        velocity: this.ballVelocity,
      });
    }
  }
}
