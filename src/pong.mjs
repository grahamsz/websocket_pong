export class Pong {
  constructor(state, env) {
    this.state = state;
    this.env = env
  }



  async initialize() {

    let stored = await this.state.storage.get("state");
    this.value = stored || { users: [], websockets: [], rand: Math.random() }
  }

  async key(ip) {
    const text = new TextEncoder().encode(`${this.env.SECRET}-${ip}`)
    const digest = await crypto.subtle.digest(
      { name: "SHA-256", },
      text, // The data you want to hash as an ArrayBuffer
    )
    const digestArray = new Uint8Array(digest)
    return btoa(String.fromCharCode.apply(null, digestArray))
  }


  async handleSession(websocket, ip) {
    websocket.accept()

    try {
      let currentState = this.value;


      let name;
      console.log(currentState.users.length);
      if (currentState.users.length == 0) {
        name = "Player 1";
      } else if (currentState.users.length == 1) {

        if (currentState.users[0].name == "Player 1") {
          name = "Player 2";
        } else {
          name = "Player 1";
        }
      } else {
        websocket.send(JSON.stringify({ msgType: "ERROR", message: "Already have two players" }));
        return;

      }

      const key = await this.key(name);

      let newUser = { id: key, name, position: '300' }

      if (name == "Player 1") {
        currentState.users.forEach(user => user.hasBall = 0);
        newUser.hasBall = 1;
      }


      websocket.send(JSON.stringify({ msgType: "WELCOME", username: name, hasBall: newUser.hasBall }));


      if (!currentState.users.find(user => user.id === key)) {
        newUser.websocket = websocket;
        currentState.users.push(newUser)
        currentState.websockets.push({ id: key, name, websocket })
      }
      currentState.users.filter(u => u.id != key).forEach(u => u.websocket.send(JSON.stringify({ username: u.name, msgType: "PADDLE_MOVE", position: u.position, hasBall: u.hasBall })))

      this.value = currentState



      websocket.addEventListener("message", async msg => {
        try {


          let { msgType, position, hasBall, hit, velocity } = JSON.parse(msg.data)
          switch (msgType) {
            case 'PADDLE_MOVE':
              let user = currentState.users.find(user => user.id === key)
              if (user) {
                user.position = position
                user.hasBall = hasBall
              }

              this.value = currentState

              currentState.users.filter(u => u.id != key).forEach(u => u.websocket.send(JSON.stringify({ username: user.name, msgType: "PADDLE_MOVE", position: position, hasBall: hasBall })))
              break;
            case 'BALL_BOUNCE':
              console.log("at ball bounce");

              currentState.users.forEach(user => user.hasBall = 0);
              //  user = currentState.users.find(user => user.id === key)

              //     console.log("got ball bounc from user" + user);
              //   this.value = currentState
              console.log(JSON.stringify({ msgType: "BALL_BOUNCE2", position: position, hit: hit, velocity: velocity }));
              currentState.users.filter(u => u.id != key).forEach(u => u.websocket.send(JSON.stringify({ msgType: "BALL_BOUNCE", position: position, hit: hit, velocity: velocity })))

              break;
            default:
              console.log(`Unknown type of message ${msgType}`)
              websocket.send(JSON.stringify({ message: "UNKNOWN" }))
              break;
          }
        } catch (err) {
          websocket.send(JSON.stringify({ error: err.toString() }))
        }
      })

      const closeOrError = async evt => {
        currentState.users = currentState.users.filter(user => user.id !== key)
        currentState.websockets = currentState.websockets.filter(user => user.id !== key)
        this.value = currentState

      }

      websocket.addEventListener("close", closeOrError)
      websocket.addEventListener("error", closeOrError)
    } catch (err) {
      websocket.send(JSON.stringify({ message: err.toString() }))
    }
  }

  // Handle HTTP requests from clients.
  async fetch(request) {
    // Make sure we're fully initialized from storage.
    if (!this.initializePromise) {
      this.initializePromise = this.initialize().catch((err) => {
        // If anything throws during initialization then we need to be
        // sure sure that a future request will retry initialize().
        // Note that the concurrency involved in resetting this shared
        // promise on an error can be tricky to get right -- we don't
        // recommend customizing it.
        this.initializePromise = undefined;
        throw err
      });
    }
    await this.initializePromise;

    // Apply requested action.
    let url = new URL(request.url);

    switch (url.pathname) {
      case "/websocket":
        if (request.headers.get("Upgrade") != "websocket") {
          return new Response("Expected websocket", { status: 406 })
        }
        let ip = request.headers.get("CF-Connecting-IP");
        let pair = new WebSocketPair();
        console.log("Made websocket pair")
        await this.handleSession(pair[1], ip);
        return new Response(null, { status: 101, webSocket: pair[0] });
      case "/":
        // Just serve the current value. No storage calls needed!
        break;
      default:
        return new Response("Not found", { status: 404 });
    }

    return new Response(this.value);
  }
}
