import React, { PropTypes } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import GiftedChat from './GiftedChatWrapper';
import RegisterOrLogin from './RegisterOrLogin'
import { inject, Provider, observer } from 'mobx-react/native';
import { createAutoSubscriber } from 'firebase-nest';

//Chat component
@observer
class ChatComponent extends React.Component {
  static propTypes = {
    store: PropTypes.object.isRequired
  }

  onLoadEarlier = () => {
    this.props.store.increaseLimitToBy(2);
  }

  onSend = (messages = []) => {
    const { store } = this.props;
    Promise.all(
      messages.map(({text, user, createdAt}) =>
        store.addMessage({text, uid: user._id || '0', timestamp: new Date(createdAt).getTime()}))
    ).catch((e) => alert('error sending message: ' + e.code))
  }

  renderError = () => {
    const { fetchError } = this.state;
    return <Text style={{textAlign:'center', fontWeight:'bold', fontSize:13, color:'darkred'}}>{fetchError}</Text>
  }

  render() {
    const { store } = this.props;
    const isLoggedIn = !!store.getAuthUser();
    const { _autoSubscriberFetching: fetching, _autoSubscriberError: fetchError } = this.state;
    const messages = store.messagesInGiftedChatFormat;
    const loginComponentHeight = isLoggedIn ? 70 : 240;
    return (
      <View style={{flex:1}}>
        <View style={{height:loginComponentHeight}}>
          <RegisterOrLogin  />
        </View>
        {isLoggedIn &&
        <View style={{flex:1}}>
          <GiftedChat
            messages={messages}
            loadEarlier={true}
            isLoadingEarlier={fetching}
            onLoadEarlier={this.onLoadEarlier}
            renderFooter={fetchError ? this.renderError : null}
            onSend={this.onSend}
            user={{
              _id: 'cookiemonster' //who are we posting as
            }}
          />
        </View>
        }
      </View>
    )
  }
}

//Auto-subscriber Chat
const Chat = inject('store')(createAutoSubscriber({
  getSubs: (props, state) => props.store.getAuthUser() ? props.store.limitedMessagesSub() : [],
  subscribeSubs: (subs, props, state) => props.store.subscribeSubsWithPromise(subs)
})(ChatComponent))

export default class AppComponent extends React.Component {
  static propTypes = {
    store: PropTypes.object.isRequired
  }

  render() {
    return (
      <Provider store={this.props.store}>
        <Chat />
      </Provider>
    );
  }
}