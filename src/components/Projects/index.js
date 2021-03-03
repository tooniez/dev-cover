/* eslint-disable camelcase */
import { useState, forwardRef } from 'react';
import { PROJECTS_GRID_LIMIT, IS_PRODUCTION, IS_PORTFOLIO, GITHUB_URL } from '@lib/constants';
import * as gtag from '@lib/gtag';
import { NumberedHeading } from '@common/styles';
import { get } from 'lodash';
import { reorder } from '@utils';
import PropTypes from 'prop-types';
import { Repo } from '@components';
import { useToasts } from '@contexts/toasts';
import { useIsMobile } from '@hooks';
import { updateUser } from '@services/user';
import dynamic from 'next/dynamic';
import { Swap } from 'react-iconly';
import { getReposData } from '@lib/user-builder';
import { StyledProjectsSection, StyledGrid } from './styles';

const Droppable = dynamic(() => import('react-beautiful-dnd').then((mod) => mod.Droppable));
const DragDropContext = dynamic(() =>
  import('react-beautiful-dnd').then((mod) => mod.DragDropContext),
);

const Projects = ({ user = {} }) => {
  const [userRepos, setUserRepos] = useState(get(user, 'repos'));
  const { ToastsType, addToastWithTimeout } = useToasts();
  const isMobile = useIsMobile();

  const handleClickLink = (link) => {
    if (IS_PRODUCTION) {
      gtag.event('link_click', 'links', 'user clicked on a link button', link);
    }
    window.open(link, '_blank');
  };

  const updateRepos = (items) => {
    const input = {
      repos: items.slice(0, PROJECTS_GRID_LIMIT),
    };
    updateUser(get(user, 'username'), input)
      .then((res) => {
        if (res.success) {
          addToastWithTimeout(ToastsType.SUCCESS, 'Repos updated');
        } else {
          addToastWithTimeout(ToastsType.ERROR, 'Something went wrong, try again later');
        }
      })
      .catch((error) => {
        console.error(error);
        addToastWithTimeout(ToastsType.ERROR, 'Something went wrong, try again later');
      });
  };

  const handleChange = (items) => {
    setUserRepos(items);
    updateRepos(items);
  };

  const onDragEnd = (result) => {
    const { destination, source } = result;
    // dropped outside the list
    if (!destination) {
      return;
    }
    const items = reorder(userRepos, source.index, destination.index);
    handleChange(items);
  };

  const handleDeleteRepo = (id) => {
    const items = userRepos.filter((repo) => repo.id !== id);
    handleChange(items);
  };

  const handleMove = (index, direction) => {
    let endIndex = 0;
    if (direction === 'left') {
      endIndex = index - 1;
    } else {
      endIndex = index + 1;
    }
    const items = reorder(userRepos, index, endIndex);
    handleChange(items);
  };

  const handleFetchGithubRepos = async () => {
    try {
      const repos = await getReposData(get(user, 'username'));
      console.log(repos);
      handleChange(repos);
    } catch (error) {
      console.log(error);
      if (get(user, 'github.limited') === true) {
        addToastWithTimeout(ToastsType.ERROR, 'Github API rate limit exceeded try again in 1 hour');
      } else {
        addToastWithTimeout(ToastsType.ERROR, 'Something went wrong, try again in 1 hour');
      }
    }
  };

  const RepoGrid = forwardRef(({ ...restProps }, ref) => (
    <StyledGrid ref={ref} {...restProps}>
      {userRepos &&
        userRepos.slice(0, PROJECTS_GRID_LIMIT).map((repo, index) => {
          const {
            id,
            name,
            description,
            stargazers_count,
            homepage,
            html_url,
            forks_count,
            language,
          } = repo;
          return (
            <Repo
              key={id}
              id={id}
              index={index}
              hideMoveActions={userRepos.length === 1}
              endIndex={PROJECTS_GRID_LIMIT - 1}
              name={name}
              description={description}
              stargazersCount={stargazers_count}
              onLinkClicked={handleClickLink}
              homepage={homepage}
              htmlUrl={html_url}
              forksCount={forks_count}
              language={language}
              onDelete={handleDeleteRepo}
              onMove={({ direction }) => handleMove(index, direction)}
            />
          );
        })}
    </StyledGrid>
  ));

  return (
    <StyledProjectsSection id="projects">
      <NumberedHeading>My Projects</NumberedHeading>
      <button type="button" className="show-original" onClick={handleFetchGithubRepos}>
        <Swap />
        Fetch Github repos
      </button>
      {IS_PORTFOLIO ? (
        <RepoGrid />
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable
            isDropDisabled={IS_PORTFOLIO || isMobile}
            droppableId="droppable-repos"
            direction="horizontal"
          >
            {(provided, snapshot) => (
              <RepoGrid
                {...provided.droppableProps}
                ref={provided.innerRef}
                isDraggingOver={snapshot.isDraggingOver}
              />
            )}
          </Droppable>
        </DragDropContext>
      )}

      {userRepos && userRepos.length > PROJECTS_GRID_LIMIT && (
        <a
          type="button"
          className="more-button"
          onClick={() => handleClickLink(`${GITHUB_URL}${get(user, 'github.login')}`)}
        >
          Show More
        </a>
      )}
    </StyledProjectsSection>
  );
};

Projects.propTypes = {
  user: PropTypes.object.isRequired,
};

export default Projects;
