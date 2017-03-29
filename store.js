
import MobxFirebaseStore from 'mobx-firebase-store';

// Assumes the following firebase data model:
//  messages: {key1: {text, timestamp, uid}, key2: {text, timestamp, uid}, ...}
//  users: {key1: {last, first}, key2: {last, first}, ...}


//Subscriptions
function limitedMessagesSubKey(limitTo) {
  return `msgs_limitedTo_${limitTo}`
}

function userSubKey(uid) {
  return `usr_${uid}`
}

export default class Store {
  constructor(fbRef) {
    this.mobxStore = new MobxFirebaseStore(fbRef);
  }

  subscribeSubsWithPromise(subs) {
    return this.mobxStore.rawSubscribeSubsWithPromie(subs);
  }

  subscribeSubs(subs) {
    return this.mobxStore.subscribeSubs(subs);
  }
  
  //Getters
  
  messagesInGiftedChatFormat({limitTo, prevLimitTo}) {
    let msgs = this.mobxStore.getData(limitedMessagesSubKey(limitTo));

    //optimization to avoid flickering while paginating - try to get previous subscription's data while we're loading older items
    if (!msgs && prevLimitTo) {
      msgs = this.mobxStore.getData(limitedMessagesSubKey(prevLimitTo))
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
      const userInfoHash = user ? `${user.get('first')}_${user.get('last')}` : ''

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
  
  addMessage({text, uid, timestamp}) {
    return this.mobxStore.fb.child('chat').child('messages').push({text, uid, timestamp})
  }
  
  //Subscriptions

  //Get messages and user for each message
  limitedMessagesSub(limitTo) {
    const fbRef = this.mobxStore.fb;
    return [{
      subKey: limitedMessagesSubKey(limitTo),
      asList: true,
      resolveFirebaseRef: () => fbRef.child('chat/messages').limitToLast(limitTo || 1),
      childSubs: (messageKey, messageData) => !messageData.uid ? [] : [{
        subKey: userSubKey(messageData.uid),
        asValue: true,
        resolveFirebaseRef: () => fbRef.child('chat/users').child(messageData.uid)
      }]
    }]
  }
}


