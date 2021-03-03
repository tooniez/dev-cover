import { useState } from 'react';
import { Post } from '@components';
import { NumberedHeading, SectionButton } from '@common/styles';
import { get, size } from 'lodash';
import * as gtag from '@lib/gtag';
import { IS_PRODUCTION, IS_GENERATOR } from '@lib/constants';
import PropTypes from 'prop-types';
import { updateUser } from '@services/user';
import { reorder } from '@utils';
import { useToasts } from '@contexts/toasts';
import { Plus } from 'react-iconly';
import { useUserDataContext } from '@contexts/user-data';
import { ShowMoreButton, ButtonContainer, PostsContainer } from './styles';

const Blog = ({ user = {} }) => {
  const [loading, setLoading] = useState(false);
  const [userPosts, setUserPosts] = useState(get(user, 'posts'));
  const { ToastsType, addToastWithTimeout } = useToasts();
  const { updateValue: updateUserData } = useUserDataContext();

  const handleClickLink = (link) => {
    if (IS_PRODUCTION) {
      gtag.event('link_click', 'links', 'user clicked on a link button', link);
    }
    window.open(link, '_blank');
  };

  const updatePosts = (items) => {
    const input = {
      posts: items,
    };
    setLoading(true);
    updateUser(get(user, 'username'), input)
      .then((res) => {
        setLoading(false);
        if (res.success) {
          addToastWithTimeout(ToastsType.SUCCESS, 'Posts updated');
        } else {
          addToastWithTimeout(ToastsType.ERROR, 'Something went wrong, try again later');
        }
      })
      .catch((error) => {
        console.error(error);
        setLoading(false);
        addToastWithTimeout(ToastsType.ERROR, 'Something went wrong, try again later');
      });
  };

  const handleMove = (index, direction) => {
    let endIndex = 0;
    if (direction === 'left') {
      endIndex = index - 1;
    } else {
      endIndex = index + 1;
    }
    const items = reorder(userPosts, index, endIndex);
    setUserPosts(items);
    updatePosts(items);
  };

  const handleDelete = (id) => {
    const items = userPosts.filter((repo) => repo.id !== id);
    if (items.length <= 0) {
      const input = { showBlog: false };
      updateUserData({ ...user, ...input });
    }
    setUserPosts(items);
    updatePosts(items);
  };

  const getBlogDomain = () => {
    if (user.hasHashnode && user?.hashnode?.publicationDomain) {
      return `https://${user.hashnode.publicationDomain}`;
    }
    if (user.hasHashnode) {
      return `https://hashnode.com/@${get(user, 'username')}`;
    }
    if (user.hasDevto) {
      return `https://dev.to/${get(user, 'username')}`;
    }
    return '#';
  };

  const handleAddBlogSection = () => {
    const input = { showBlog: true };
    updateUserData({ ...user, ...input });
    setUserPosts(get(user, 'posts'));
  };

  if (!user?.showBlog && size(get(user, 'posts')) > 0 && IS_GENERATOR) {
    return (
      <SectionButton>
        <button onClick={handleAddBlogSection} type="button">
          <Plus />
          {loading ? 'Adding...' : 'Add blog section'}
        </button>
      </SectionButton>
    );
  }

  return (
    <section id="blog">
      <NumberedHeading>Latest Blogs</NumberedHeading>
      <PostsContainer>
        {userPosts &&
          userPosts.map((post, index) => {
            return (
              <Post
                key={post.id}
                index={index}
                hideMoveActions={userPosts.length === 1}
                endIndex={user.posts.length - 1}
                onMove={({ direction }) => handleMove(index, direction)}
                onDelete={handleDelete}
                {...post}
              />
            );
          })}
      </PostsContainer>
      <ButtonContainer>
        <ShowMoreButton
          onClick={() => handleClickLink(getBlogDomain())}
          target="_blank"
          rel="noreferrer"
        >
          Show More
        </ShowMoreButton>
      </ButtonContainer>
    </section>
  );
};

Blog.propTypes = {
  user: PropTypes.object.isRequired,
};

export default Blog;
