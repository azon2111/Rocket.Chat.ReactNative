import React from 'react';
import {
	View, Text, Image, BackHandler, Linking
} from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import * as FileSystem from 'expo-file-system';
import Orientation from 'react-native-orientation-locker';
import {
	serverRequest
} from '../../actions/server';

import { appStart as appStartAction } from '../../actions';
import I18n from '../../i18n';
import Button from '../../containers/Button';
import styles from './styles';
import { isTablet } from '../../utils/deviceInfo';
import { themes } from '../../constants/colors';
import { withTheme } from '../../theme';
import FormContainer, { FormContainerInner } from '../../containers/FormContainer';

class OnboardingView extends React.Component {
	static navigationOptions = () => ({
		header: null
	})

	static propTypes = {
		navigation: PropTypes.object,
		appStart: PropTypes.func,
		theme: PropTypes.string
	}

	constructor(props) {
		super(props);
		BackHandler.addEventListener('hardwareBackPress', this.handleBackPress);
		if (!isTablet) {
			Orientation.lockToPortrait();
		}
		this.state = {
			certificate: null
		}
	}

	shouldComponentUpdate(nextProps) {
		const { theme } = this.props;
		if (theme !== nextProps.theme) {
			return true;
		}
		return false;
	}

	componentWillUnmount() {
		BackHandler.removeEventListener('hardwareBackPress', this.handleBackPress);
	}

	handleBackPress = () => {
		const { appStart } = this.props;
		appStart('background');
		return false;
	}

	uriToPath = uri => uri.replace('file://', '');

	completeUrl = (url) => {
		const parsedUrl = parse(url, true);
		if (parsedUrl.auth.length) {
			url = parsedUrl.origin;
		}

		url = url && url.replace(/\s/g, '');

		if (/^(\w|[0-9-_]){3,}$/.test(url)
			&& /^(htt(ps?)?)|(loca((l)?|(lh)?|(lho)?|(lhos)?|(lhost:?\d*)?)$)/.test(url) === false) {
			url = `${ url }.rocket.chat`;
		}

		if (/^(https?:\/\/)?(((\w|[0-9-_])+(\.(\w|[0-9-_])+)+)|localhost)(:\d+)?$/.test(url)) {
			if (/^localhost(:\d+)?/.test(url)) {
				url = `http://${ url }`;
			} else if (/^https?:\/\//.test(url) === false) {
				url = `https://${ url }`;
			}
		}

		return url.replace(/\/+$/, '').replace(/\\/g, '/');
	}

	connectServer = async () => {
		const { navigation } = this.props;
		const { certificate } = this.state;
		const { connectServer } = this.props;
		let cert = null;

		if (certificate) {
			const certificatePath = `${ FileSystem.documentDirectory }/${ certificate.name }`;
			try {
				await FileSystem.copyAsync({ from: certificate.path, to: certificatePath });
			} catch (e) {
				log(e);
			}
			cert = {
				path: this.uriToPath(certificatePath), // file:// isn't allowed by obj-C
				password: certificate.password
			};
		}

		connectServer("https://oliveuc.oliveitky.com", cert);
		navigation.navigate('LoginView');
	}

	createWorkspace = async() => {
		try {
			await Linking.openURL('https://cloud.rocket.chat/trial');
		} catch {
			// do nothing
		}
	}

	render() {
		const { theme } = this.props;
		return (
			<FormContainer theme={theme}>
				<FormContainerInner>
					<Image style={styles.onboarding} source={{ uri: 'logo' }} fadeDuration={0} />
					<Text style={[styles.title, { color: themes[theme].titleText }]}>{I18n.t('Onboarding_title')}</Text>
					<Text style={[styles.subtitle, { color: themes[theme].controlText }]}>{I18n.t('Onboarding_subtitle')}</Text>
					<Text style={[styles.description, { color: themes[theme].auxiliaryText }]}>{I18n.t('Onboarding_description')}</Text>
					<View style={styles.buttonsContainer}>
						<Button
							title={'Get Started'}
							type='primary'
							onPress={this.connectServer}
							theme={theme}
						/>
						{/* <Button
							title={I18n.t('Create_a_new_workspace')}
							type='secondary'
							backgroundColor={themes[theme].chatComponentBackground}
							onPress={this.createWorkspace}
							theme={theme}
						/> */}
					</View>
				</FormContainerInner>
			</FormContainer>
		);
	}
}

const mapDispatchToProps = dispatch => ({
	appStart: root => dispatch(appStartAction(root)),
	connectServer: (server, certificate) => dispatch(serverRequest(server, certificate))
});

export default connect(null, mapDispatchToProps)(withTheme(OnboardingView));
