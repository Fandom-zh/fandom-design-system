import { inject as service } from '@ember/service';
import { alias } from '@ember/object/computed';
import Component from '@ember/component';
import { computed } from '@ember/object';
import wrapMeHelper from '@wikia/ember-fandom/helpers/wrap-me';
import extend from '@wikia/ember-fandom/utils/extend';
import notificationTypes from '../../utils/notification-types';

export default Component.extend(
	{
		i18n: service(),
		logger: service(),
		wdsOnSiteNotifications: service(),
		wikiUrls: service(),
		wikiVariables: service(),

		classNames: ['wds-notification-card'],
		classNameBindings: ['isUnread:wds-is-unread'],
		tagName: 'li',

		isUnread: alias('model.isUnread'),

		iconName: computed('model.type', function () {
			const type = this.get('model.type');

			if (this.isCommentNotifictionType(type)) {
				return 'wds-icons-comment-small';
			}

			if (this.isAnnouncement(type)) {
				return 'wds-icons-flag-small';
			}

			if (this.isArticleCommentReply(type)) {
				return 'wds-icons-reply-small';
			}

			if (this.isArticleCommentAtMention(type) || this.isArticleCommentReplyAtMention(type)) {
				return 'wds-icons-mention-small';
			}

			return 'wds-icons-heart-small';
		}),

		postTitleMarkup: computed('model.title', function () {
			return wrapMeHelper.compute([
				this.get('model.title')
			], {
				tagName: 'b',
			});
		}),

		showSnippet: computed('model.{title,type}', function () {
			// Old discussions posts without title
			return !this.get('model.title') && !this.isAnnouncement(this.get('model.type'));
		}),

		showLastActor: computed('model.type', function () {
			return this.isAnnouncement(this.get('model.type'));
		}),

		text: computed('model', function () {

			if (this.isAnnouncement(this.model.type)) {
				return this.model.snippet;
			} else {
				return null;
			}
		}),

		// Make sure to escape user input
		textWithHtml: computed('model', function () {
			const { type } = this.model;

			if (this.isDiscussionReply(type)) {
				return this.getReplyMessageBody(this.model);
			}

			if (this.isDiscussionPostUpvote(type)) {
				return this.getPostUpvoteMessageBody(this.model);
			}

			if (this.isDiscussionReplyUpvote(type)) {
				return this.getReplyUpvoteMessageBody(this.model);
			}

			if (this.isPostAtMention(type)) {
				return this.getPostAtMentionMessageBody(this.model);
			}

			if (this.isThreadAtMention(type)) {
				return this.getThreadAtMentionMessageBody(this.model);
			}

			if (this.isArticleCommentReply(type)) {
				return this.getArticleCommentReplyMessageBody(this.model);
			}

			if (this.isArticleCommentAtMention(type)) {
				return this.getArticleCommentAtMentionMessageBody(this.model);
			}

			if (this.isArticleCommentReplyAtMention(type)) {
				return this.getArticleCommentReplyAtMentionMessageBody(this.model);
			}

			return null;
		}),

		showAvatars: computed('model.{totalUniqueActors,type}', function () {
			return this.get('model.totalUniqueActors') > 2 &&
				this.isDiscussionReply(this.get('model.type'));
		}),

		avatars: computed('model', function () {
			const avatars = [];
			const latestActors = this.get('model.latestActors') || [];

			latestActors.forEach((actor) => {
				avatars.push({
					src: actor.avatarUrl,
					link: this.wikiUrls.build({
						host: this.wikiVariables.host,
						namespace: 'User',
						title: actor.name
					})
				});
			});
			return avatars;
		}),

		didInsertElement() {
			const { type, isUnread } = this.model;

			this.track({
				action: 'impression',
				category: 'on-site-notifications',
				label: type,
				value: isUnread ? 1 : 0
			});
		},

		actions: {
			onNotificationClicked() {
				const { type, isUnread } = this.model;
				const wdsOnSiteNotifications = this.wdsOnSiteNotifications;

				this.track({
					action: 'click',
					category: 'on-site-notifications',
					label: type,
					value: isUnread ? 1 : 0
				});

				if (isUnread) {
					wdsOnSiteNotifications
						.markAsRead(this.model, true)
						.then(() => {
							wdsOnSiteNotifications.goToDestination(this.model);
						});
				} else {
					wdsOnSiteNotifications.goToDestination(this.model);
				}
			},

			markAsRead() {
				if (!this.model.get('isUnread')) {
					return;
				}

				this.track({
					action: 'click',
					category: 'on-site-notifications',
					label: `mark-as-read-${this.model.type}`
				});
				this.wdsOnSiteNotifications.markAsRead(this.model);
			}
		},

		isCommentNotifictionType(type) {
			return this.isDiscussionReply(type) || this.isPostAtMention(type) || this.isThreadAtMention(type);
		},

		isDiscussionReply(type) {
			return type === notificationTypes.discussionReply;
		},

		isDiscussionReplyUpvote(type) {
			return type === notificationTypes.discussionUpvoteReply;
		},

		isDiscussionPostUpvote(type) {
			return type === notificationTypes.discussionUpvotePost;
		},

		isAnnouncement(type) {
			return type === notificationTypes.announcement;
		},

		isPostAtMention(type) {
			return type === notificationTypes.postAtMention;
		},

		isThreadAtMention(type) {
			return type === notificationTypes.threadAtMention;
		},

		isArticleCommentReply(type) {
			return type === notificationTypes.articleCommentReply;
		},

		isArticleCommentAtMention(type) {
			return type === notificationTypes.articleCommentAtMention;
		},

		isArticleCommentReplyAtMention(type) {
			return type === notificationTypes.articleCommentReplyAtMention;
		},

		getPostUpvoteMessageBody(model) {
			const hasTitle = model.get('title');
			const totalUniqueActors = model.get('totalUniqueActors');
			const hasMultipleUsers = totalUniqueActors > 1;

			if (hasTitle) {
				if (hasMultipleUsers) {
					return this.getTranslatedMessage('notifications-post-upvote-multiple-users-with-title', {
						postTitle: this.postTitleMarkup,
						number: totalUniqueActors
					});
				} else {
					return this.getTranslatedMessage('notifications-post-upvote-single-user-with-title', {
						postTitle: this.postTitleMarkup,
					});
				}
			} else if (hasMultipleUsers) {
				return this.getTranslatedMessage('notifications-post-upvote-multiple-users-no-title', {
					number: totalUniqueActors
				});
			} else {
				return this.getTranslatedMessage('notifications-post-upvote-single-user-no-title');
			}
		},

		getReplyMessageBody(model) {
			const hasTitle = model.get('title');
			const totalUniqueActors = model.get('totalUniqueActors');
			const hasTwoUsers = totalUniqueActors === 2;
			const hasThreeOrMoreUsers = totalUniqueActors > 2;
			const firstReplierName = model.get('latestActors.0.name');

			if (hasTitle) {
				if (hasThreeOrMoreUsers) {
					return this.getTranslatedMessage('notifications-replied-by-multiple-users-with-title', {
						postTitle: this.postTitleMarkup,
						mostRecentUser: firstReplierName,
						number: totalUniqueActors - 1
					});
				} else if (hasTwoUsers) {
					return this.getTranslatedMessage('notifications-replied-by-two-users-with-title', {
						firstUser: firstReplierName,
						secondUser: model.get('latestActors.1.name'),
						postTitle: this.postTitleMarkup,
					});
				} else {
					return this.getTranslatedMessage('notifications-replied-by-with-title', {
						user: firstReplierName,
						postTitle: this.postTitleMarkup,
					});
				}
			} else if (hasThreeOrMoreUsers) {
				return this.getTranslatedMessage('notifications-replied-by-multiple-users-no-title', {
					username: this.usernameMarkup,
					mostRecentUser: firstReplierName,
					number: totalUniqueActors - 1
				});
			} else if (hasTwoUsers) {
				return this.getTranslatedMessage('notifications-replied-by-two-users-no-title', {
					firstUser: firstReplierName,
					secondUser: model.get('latestActors.1.name'),
				});
			} else {
				return this.getTranslatedMessage('notifications-replied-by-no-title', {
					user: firstReplierName,
				});
			}
		},

		getReplyUpvoteMessageBody(model) {
			const hasTitle = model.get('title');
			const totalUniqueActors = model.get('totalUniqueActors');
			const hasMultipleUsers = totalUniqueActors > 1;

			if (hasTitle) {
				if (hasMultipleUsers) {
					return this.getTranslatedMessage('notifications-reply-upvote-multiple-users-with-title', {
						postTitle: this.postTitleMarkup,
						number: totalUniqueActors - 1
					});
				} else {
					return this.getTranslatedMessage('notifications-reply-upvote-single-user-with-title', {
						postTitle: this.postTitleMarkup,
					});
				}
			} else if (hasMultipleUsers) {
				return this.getTranslatedMessage('notifications-reply-upvote-multiple-users-no-title', {
					number: totalUniqueActors
				});
			} else {
				return this.getTranslatedMessage('notifications-reply-upvote-single-user-no-title');
			}
		},

		getPostAtMentionMessageBody(model) {
			return this.getTranslatedMessage('notifications-reply-at-mention', {
				postTitle: this.postTitleMarkup,
				mentioner: model.get('latestActors.0.name')
			});
		},

		getThreadAtMentionMessageBody(model) {
			return this.getTranslatedMessage('notifications-post-at-mention', {
				postTitle: this.postTitleMarkup,
				mentioner: model.get('latestActors.0.name')
			});
		},

		getArticleCommentReplyMessageBody(model) {
			const currentUserId = this.wdsOnSiteNotifications.currentUser.userId;
			const messageKey = model.get('refersToAuthorId') === currentUserId
				? 'notifications-article-comment-reply-own-comment'
				: 'notifications-article-comment-reply-followed-comment';

			return this.getTranslatedMessage(messageKey, {
				user: model.get('latestActors.0.name'),
				articleTitle: model.get('title')
			});
		},

		getArticleCommentAtMentionMessageBody(model) {
			return this.getTranslatedMessage('notifications-article-comment-comment-mention', {
				user: model.get('latestActors.0.name'),
				articleTitle: model.get('title')
			});
		},

		getArticleCommentReplyAtMentionMessageBody(model) {
			return this.getTranslatedMessage('notifications-article-comment-reply-mention', {
				user: model.get('latestActors.0.name'),
				articleTitle: model.get('title')
			});
		},

		getTranslatedMessage(key, context) {
			const fullContext = extend({}, {
				ns: 'design-system',
			}, context);

			return this.i18n.t(key, fullContext);
		},
	}
);
