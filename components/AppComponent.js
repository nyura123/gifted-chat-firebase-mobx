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

  state = {
    fetching: false,
    fetchError: null
  }

  //used by createAutoSubscriber HOC
  subscribeSubs(subs, props, state) {
    //More advanced version of subscribeSubs with loading indicator and error handling.

    const { store } = this.props;

    const {unsubscribe, promise} = store.subscribeSubsWithPromise(subs);

    this.setState({
      fetching: true,
      fetchError: null
    }, () => {
      promise.then(() => {
        this.setState({
          fetching: false
        })
      }, (error) => {
        this.setState({
          fetching: false,
          fetchError: error
        })
      })
    });

    return unsubscribe;
  }

  onLoadEarlier = () => {
    this.props.store.increaseLimitToBy(10);
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
    const { fetching, fetchError } = this.state;
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
  getSubs: (props, state) => props.store.getAuthUser() ? props.store.limitedMessagesSub() : []
  //defining subscribeSubs on the component for loading indicator
  // subscribeSubs: (subs, props, state) => props.util.subscribeSubs(subs)
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