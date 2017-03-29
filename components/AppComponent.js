import React, { PropTypes } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import GiftedChat from './GiftedChatWrapper';
import { inject, Provider, observer } from 'mobx-react/native';
import { createAutoSubscriber } from 'firebase-nest';

function deferredUnsubscribe(unsubscribe) {
  //optimization to avoid flickering when paginating - keep current data for a bit while we wait for new query that includes older items
  return () => setTimeout(() => unsubscribe(), 1000);
}

//Chat component
@observer
class ChatComponent extends React.Component {
  static propTypes = {
    store: PropTypes.object.isRequired
  }

  state = {
    fetching: false,
    limitTo: 10,
    prevLimitTo: null
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

    return deferredUnsubscribe(unsubscribe)
  }

  onLoadEarlier = () => {
    this.setState((previousState) => ({
      ...previousState,
      limitTo: previousState.limitTo + 10,
      prevLimitTo: previousState.limitTo
    }));
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
    const { limitTo, prevLimitTo, fetching, fetchError } = this.state;
    const messages = store.messagesInGiftedChatFormat({limitTo, prevLimitTo});
    return (
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
    )
  }
}

//Auto-subscriber Chat
const Chat = inject('store')(createAutoSubscriber({
  getSubs: (props, state) => props.store.limitedMessagesSub(state.limitTo)
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