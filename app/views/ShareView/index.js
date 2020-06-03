import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
	View,
	Text,
	Image,
	FlatList,
	SafeAreaView,
	InteractionManager
} from 'react-native';
import { connect } from 'react-redux';
import ShareExtension from 'rn-extensions-share';
import { BorderlessButton } from 'react-native-gesture-handler';

import { themes } from '../../constants/colors';
import I18n from '../../i18n';
import styles from './styles';
import Loading from '../../containers/Loading';
import { CancelModalButton } from '../../containers/HeaderButton';
import { isBlocked } from '../../utils/room';
import { isReadOnly } from '../../utils/isReadOnly';
import { withTheme } from '../../theme';
import { themedHeader } from '../../utils/navigation';
import Header from './Header';
import MessageBox from '../../containers/MessageBox';
import ImageViewer from '../../presentation/ImageViewer';
import RocketChat from '../../lib/rocketchat';
import { CustomIcon } from '../../lib/Icons';
import { BUTTON_HIT_SLOP } from '../../containers/message/utils';

const ShareView = React.memo(({
	navigation,
	theme,
	user: {
		id,
		username,
		token
	},
	server
}) => {
	const [loading, setLoading] = useState(false);
	const [readOnly, setReadOnly] = useState(false);
	const [attachments, setAttachments] = useState([]);
	const [selected, select] = useState(0);
	const room = navigation.getParam('room', {});
	const shareExtension = navigation.getParam('shareExtension');

	const remove = (index) => {
		const cpAttachments = attachments;
		cpAttachments.splice(index, 1);
		setAttachments(cpAttachments);
	};

	const send = async() => {
		if (loading) {
			return;
		}

		if (shareExtension) {
			setLoading(true);
		} else {
			navigation.pop();
		}

		try {
			await Promise.all(attachments.map(({
				filename: name,
				mime: type,
				description,
				size,
				path
			}) => RocketChat.sendFileMessage(
				room.rid,
				{
					name,
					description,
					size,
					type,
					path,
					store: 'Uploads'
				},
				undefined,
				server,
				{ id, token }
			)));
		} catch {
			// Do nothing
		}

		if (shareExtension) {
			ShareExtension.close();
		}
	};

	const onChangeText = (text) => {
		attachments[selected].description = text;
		setAttachments(attachments);
	};

	useEffect(() => {
		(async() => {
			const ro = await isReadOnly(room, { username });
			setReadOnly(ro);
		})();

		// set attachments just when it was mounted to prevent memory issues
		InteractionManager.runAfterInteractions(() => {
			setAttachments(navigation.getParam('attachments', []));
		});
	}, []);

	if (readOnly || isBlocked(room)) {
		return (
			<View style={[styles.container, styles.centered, { backgroundColor: themes[theme].backgroundColor }]}>
				<Text style={styles.title}>
					{isBlocked(room) ? I18n.t('This_room_is_blocked') : I18n.t('This_room_is_read_only')}
				</Text>
			</View>
		);
	}

	return (
		<SafeAreaView style={{ backgroundColor: themes[theme].backgroundColor }}>
			<ImageViewer uri={attachments[selected]?.path} />
			<MessageBox
				showSend
				rid={room.rid}
				roomType={room.t}
				theme={theme}
				onSubmit={send}
				getCustomEmoji={() => {}}
				onChangeText={onChangeText}
				message={attachments[selected]?.description}
				navigation={navigation}
			>
				<FlatList
					horizontal
					data={attachments}
					renderItem={({ item, index }) => (
						<BorderlessButton onPress={() => select(index)} style={styles.item}>
							<Image source={{ uri: item.path }} style={styles.thumb} />
							<BorderlessButton
								hitSlop={BUTTON_HIT_SLOP}
								style={[styles.remove, { backgroundColor: themes[theme].bodyText, borderColor: themes[theme].auxiliaryBackground }]}
								onPress={() => remove(index)}
							>
								<CustomIcon
									name='cross'
									color={themes[theme].backgroundColor}
									size={16}
								/>
							</BorderlessButton>
						</BorderlessButton>
					)}
					style={[styles.list, { backgroundColor: themes[theme].auxiliaryBackground }]}
				/>
			</MessageBox>
			<Loading visible={loading} />
		</SafeAreaView>
	);
});
ShareView.navigationOptions = ({ navigation, screenProps }) => {
	const { theme } = screenProps;
	const room = navigation.getParam('room', {});
	const shareExtension = navigation.getParam('shareExtension');

	const options = {
		...themedHeader(screenProps.theme),
		headerTitle: <Header room={room} theme={theme} />
	};

	// if is share extension show default back button
	if (!shareExtension) {
		options.headerLeft = <CancelModalButton onPress={() => navigation.pop()} />;
	}

	return options;
};
ShareView.propTypes = {
	navigation: PropTypes.object,
	theme: PropTypes.string,
	user: PropTypes.shape({
		id: PropTypes.string.isRequired,
		username: PropTypes.string.isRequired,
		token: PropTypes.string.isRequired
	}),
	server: PropTypes.string
};

const mapStateToProps = (({ share, login, server }) => ({
	user: {
		id: share.user?.id || login.user?.id,
		username: share.user?.username || login.user?.username,
		token: share.user?.token || login.user?.token
	},
	server: share.server || server.server
}));

export default connect(mapStateToProps)(withTheme(ShareView));
