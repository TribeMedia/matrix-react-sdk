/*
Copyright 2015, 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

var React = require("react");
var sdk = require('../../../index');
var MatrixClientPeg = require("../../../MatrixClientPeg");

module.exports = React.createClass({
    displayName: 'EncryptedEventDialog',

    propTypes: {
        onFinished: React.PropTypes.func,
    },

    componentWillMount: function() {
        var client = MatrixClientPeg.get();
        client.on("deviceVerificationChanged", this.onDeviceVerificationChanged);

        client.downloadKeys([this.props.event.getSender()], true).done(()=>{
            var devices = client.getStoredDevicesForUser(this.props.event.getSender());
            this.setState({ device: this.refreshDevice() });
        }, (err)=>{
            console.log("Error downloading devices", err);
        });
    },

    componentWillUnmount: function() {
        var client = MatrixClientPeg.get();
        if (client) {
            client.removeListener("deviceVerificationChanged", this.onDeviceVerificationChanged);
        }
    },

    refreshDevice: function() {
        // XXX: gutwrench - is there any reason not to expose this on MatrixClient itself?
        return MatrixClientPeg.get()._crypto.getDeviceByIdentityKey(
                    this.props.event.getSender(),
                    this.props.event.getWireContent().algorithm,
                    this.props.event.getWireContent().sender_key
                );
    },

    getInitialState: function() {
        return { device: this.refreshDevice() };
    },

    onDeviceVerificationChanged: function(userId, device) {
        if (userId == this.props.event.getSender()) {
            this.setState({ device: this.refreshDevice() });
        }
    },

    onKeyDown: function(e) {
        if (e.keyCode === 27) { // escape
            e.stopPropagation();
            e.preventDefault();
            this.props.onFinished(false);
        }
    },

    render: function() {
        var event = this.props.event;
        var device = this.state.device;

        var MemberDeviceInfo = sdk.getComponent('rooms.MemberDeviceInfo');

        return (
            <div className="mx_EncryptedEventDialog" onKeyDown={ this.onKeyDown }>
                <div className="mx_Dialog_title">
                    End-to-end encryption information
                </div>
                <div className="mx_Dialog_content">
                    <table>
                        <tbody>
                            <tr>
                                <td>Sent by</td>
                                <td>{ event.getSender() }</td>
                            </tr>
                            <tr>
                                <td>Sender device name</td>
                                <td>{ device ? device.getDisplayName() : <i>unknown device</i>}</td>
                            </tr>
                            <tr>
                                <td>Sender device ID</td>
                                <td>{ device ? <code>{ device.deviceId }</code> : <i>unknown device</i>}</td>
                            </tr>
                            <tr>
                                <td>Sender device verification</td>
                                <td>{ MatrixClientPeg.get().isEventSenderVerified(event) ? "verified" : <b>NOT verified</b> }</td>
                            </tr>
                            <tr>
                                <td>Sender device ed25519 identity key</td>
                                <td>{ device ? <code>{device.getFingerprint()}</code> : <i>unknown device</i>}</td>
                            </tr>
                            <tr>
                                <td>Sender device curve25519 olm key</td>
                                <td><code>{ event.getWireContent().sender_key || <i>none</i> }</code></td>
                            </tr>
                            <tr>
                                <td>Algorithm</td>
                                <td>{ event.getWireContent().algorithm || <i>unencrypted</i> }</td>
                            </tr>
                        {
                            event.getContent().msgtype === 'm.bad.encrypted' ? (
                            <tr>
                                <td>Decryption error</td>
                                <td>{ event.getContent().body }</td>
                            </tr>
                            ) : ''
                        }
                            <tr>
                                <td>Session ID</td>
                                <td><code>{ event.getWireContent().session_id || <i>none</i> }</code></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className="mx_Dialog_buttons">
                    <button className="mx_Dialog_primary" onClick={ this.props.onFinished } autoFocus={ true }>
                        OK
                    </button>
                    <MemberDeviceInfo ref="memberDeviceInfo" hideInfo={true} device={ this.state.device } userId={ this.props.event.getSender() }/>
                </div>
            </div>
        );
    }
});


