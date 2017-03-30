import React, { Component, PropTypes } from 'react';
import { Text, TextInput, View, ScrollView, TouchableOpacity } from 'react-native';
import { inject, observer } from 'mobx-react/native';

@inject('store')
@observer
export default class RegisterOrLogin extends Component {
    static propTypes = {
        store: PropTypes.object.isRequired,
        onFocus: PropTypes.func,
        onBlur: PropTypes.func
    }

    state = {
        email: '',
        password: '',
        inProgress: null,
        localError: null
    }

    resetState = (authError) => {
        this.setState({
            localError: null,
            inProgress: null,
            password: '',
            authError
        });
    }
    
    register = () => {
        const {email, password} = this.state;

        if (!email || !password) {
            this.setState({
                localError: 'Enter email and password'
            });
            return;
        }
        const {store} = this.props;
        this.setState({inProgress: 'Registering...'}, () => {
            store.createUser({
                email,
                password
            })
              .then(() => this.resetState())
              .catch(error => this.resetState(error));
        });
    }

    login = () => {
        const {email, password} = this.state;

        if (!email || !password) {
            this.setState({
                localError: 'Enter email and password'
            });
            return;
        }

        const {store} = this.props;
        this.setState({inProgress: 'Logging In...'}, () => {
            store.signIn({
                email,
                password
            })
              .then(() => this.resetState())
              .catch(error => this.resetState(error));
        });
    }

    logout = () => {
        const { store } = this.props;

        this.setState({inProgress: 'Logging Out...'}, () => {
            store.signOut()
              .then(() => this.resetState())
              .catch(error => this.resetState(error));
        });
    }

    focusOnPassword = () => {
        const input = this.refs['pwd'];
        if (input) {
            input.focus();
        }
    }

    renderLoginForm() {
        const {email, password} = this.state;
        return (
          <View style={{marginTop: 20, alignSelf: 'stretch', alignItems: 'center'}}>
              <TextInput
                ref='email'
                autoFocus={false}
                autoCorrect={false}
                autoCapitalize='none'
                style={{borderWidth: 1, borderColor: 'grey', alignSelf:'stretch', height:50, textAlign: 'center'}}
                onChangeText={(text) => this.setState({email:text})}
                placeholder="Email"
                keyboardType="email-address"

                returnKeyType='next'
                blurOnSubmit={false}
                onSubmitEditing={this.focusOnPassword}

                value={email}
                clearButtonMode='while-editing'
              />

              <TextInput
                ref='pwd'
                autoCorrect={false}
                autoCapitalize='none'
                style={{borderWidth: 1, borderColor: 'grey', alignSelf:'stretch', height:50, textAlign: 'center'}}
                onChangeText={(text) => this.setState({password:text})}
                placeholder="Password"
                secureTextEntry={true}

                returnKeyType='go'
                blurOnSubmit={false}
                onSubmitEditing={this.login}

                value={password}
                clearButtonMode='while-editing'
              />

              <View style={{flexDirection: 'row', height:60}} >
                  <TouchableOpacity onPress={this.login} style={{borderWidth: 1, borderColor: 'grey', justifyContent:'center', alignItems:'center', flex:1, height:50}}>
                      <Text>
                          Login
                      </Text>
                  </TouchableOpacity>
                  <TouchableOpacity  onPress={this.register} style={{borderWidth: 1, borderColor: 'grey', justifyContent:'center', alignItems:'center', flex:1, height:50}}>
                      <Text>
                          Register
                      </Text>
                  </TouchableOpacity>
              </View>
          </View>
        );
    }

    renderLogoutButton() {
        return (
          <TouchableOpacity onPress={this.logout}>
              <Text>
                  Logout
              </Text>
          </TouchableOpacity>
        );
    }

    render() {
        const {localError, inProgress, authError} = this.state;
        const {store} = this.props;

        const authUser = store.authUser();
        
        return (
            <ScrollView keyboardShouldPersistTaps='never' contentContainerStyle={{marginTop:20, flexDirection:'column',alignItems:'center'}}>
                {inProgress && <Text>{inProgress}</Text> }
                {localError && <Text style={{backgroundColor:'red'}}>{localError}</Text> }
                {authError && <Text style={{backgroundColor:'red'}}>API Error: {JSON.stringify(authError)}</Text> }
                {authUser && <Text>Signed in as {authUser.email}</Text> }
                {!authUser && this.renderLoginForm() }
                {authUser && this.renderLogoutButton()}
            </ScrollView>
        );
    }

}
