
import MobxFirebaseStore from 'mobx-firebase-store';
import {action, observable, computed} from 'mobx';
import firebase from 'firebase';

// Assumes the following firebase data model:
//  messages: {key1: {text, timestamp, uid}, key2: {text, timestamp, uid}, ...}
//  users: {key1: {last, first}, key2: {last, first}, ...}


//Subscriptions
function limitedMessagesSubKey(limitTo) {
  return `msgs_limitedTo_${limitTo}`;
}

function userSubKey(uid) {
  return `usr_${uid}`;
}

export default class Store {
  constructor(fbApp, {limitTo = 2, watchAuth = true} = {}) {
    this.fbApp = fbApp;

    //unsubscribeDelayMs is an optimization for paging to prevent flickering empty data:
    // - give some time for new page to come before unsubscribing/removing data for current page
    this.mobxStore = new MobxFirebaseStore(firebase.database(fbApp).ref(), {unsubscribeDelayMs: 1000});
    
    this.limitTo = limitTo;
    this.initialLimitTo = limitTo;
    
    //AUTH
    //TODO figure out when unwatchAuth should be called
    if (watchAuth) {
      this.unwatchAuth = firebase.auth(this.fbApp).onAuthStateChanged(user => {
        this.authUser = user;

        if (!user) {
          //reset paging to initial limitTo on logout
          this.limitTo = this.initialLimitTo;
        }
      });
    }
  }

  cleanup() {
    if (this.unwatchAuth) {
      this.unwatchAuth();
    }
  }

  //observables
  @observable authUser = null;
  @observable limitTo = 2;
  @observable prevLimitTo = null;
  
  //Getters

  getAuthUser() { return this.authUser; }

  @computed get messagesInGiftedChatFormat() {
    const { limitTo, prevLimitTo } = this;
    
    let msgs = this.mobxStore.getData(limitedMessagesSubKey(limitTo));

    //optimization to avoid flickering while paginating - try to get previous subscription's data while we're loading older items
    if (!msgs && prevLimitTo) {
      msgs = this.mobxStore.getData(limitedMessagesSubKey(prevLimitTo));
    }

    if (!msgs) {
      return [];
    }

    const res = msgs.entries().map((entry) => {
      const msgKey = entry[0];
      const msg = entry[1];
      const uid = msg.uid || null;
      const user = (uid ? this.mobxStore.getData(userSubKey(uid)) : null);

      //Gifted message will not update unless msgKey changes. So as user info comes in, add user's info to the message key
      const userInfoHash = user ? `${user.get('first')}_${user.get('last')}` : '';

      return {
        _id: msgKey + userInfoHash,
        text: msg.text || '',
        createdAt: new Date(msg.timestamp),
        user: {
          _id: uid,
          name: user ? (user.get('first') + ' ' + user.get('last')) : '. .',
          //avatar: 'https://facebook.github.io/react/img/logo_og.png'
        }
      }
    });

    //Show latest messages on the bottom
    res.reverse();

    return res;
  }
  
  //Write to firebase
  @action
  addMessage({text, uid, timestamp}) {
    return this.mobxStore.fb.child('chat').child('messages').push({text, uid, timestamp})
  }
  
  //Increase query limit
  @action
  increaseLimitToBy(incr) {
    const prevLimitTo = this.limitTo;
    this.limitTo = prevLimitTo + incr;
    this.prevLimitTo = prevLimitTo;
  }

  //Subscriptions

  subscribeSubsWithPromise(subs) {
    return this.mobxStore.subscribeSubsWithPromise(subs);
  }

  //Get messages and user for each message
  limitedMessagesSub() {
    const { limitTo } = this;
    const fbRef = this.mobxStore.fb;
    return [{
      subKey: limitedMessagesSubKey(limitTo),
      asList: true,
      resolveFirebaseRef: () => fbRef.child('chat/messages').limitToLast(limitTo || 1),
      //onData: (type, snapshot) => console.log('got msgs ',type,snapshot.val()),
      childSubs: (messageKey, messageData) => !messageData.uid ? [] : [{
        subKey: userSubKey(messageData.uid),
        asValue: true,
        resolveFirebaseRef: () => fbRef.child('chat/users').child(messageData.uid),
        //onData: (type, snapshot) => console.log('got user ',type,snapshot.val())
      }]
    }]
  }
  
  @action
  signIn({email, password}) {
    return firebase.auth(this.fbApp).signInWithEmailAndPassword(email, password);
  }

  @action
  createUser({email, password}) {
    return firebase.auth(this.fbApp).createUserWithEmailAndPassword(email, password);
  }

  @action
  signOut() {
    return firebase.auth(this.fbApp).signOut();
  }

  @action
  sendPasswordResetEmail({email}) {
    return firebase.auth(this.fbApp).sendPasswordResetEmail(email);
  }
}
