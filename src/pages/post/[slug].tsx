import { useRouter } from 'next/router';
import { GetStaticPaths, GetStaticProps } from 'next';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';

import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';
import { getPrismicClient } from '../../services/prismic';

import Header from '../../components/Header';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  time_to_read: string;
}

export default function Post({ post, time_to_read }: PostProps) {
  const { isFallback } = useRouter();

  if (isFallback) {
    return <div>Carregando..</div>;
  }

  return (
    <>
      <div className={styles.header}>
        <Header />
      </div>
      <section className={`${styles.banner}`}>
        <img src={post.data.banner.url} alt={post.data.title} />
      </section>
      <main className={`${commonStyles.container} ${styles.content}`}>
        <div className={commonStyles.posts}>
          <a className={styles.title}>{post.data.title}</a>
          <p className={commonStyles.subtitle} />
          <div>
            <time>
              <FiCalendar size={20} /> {post.first_publication_date}
            </time>
            <span>
              <FiUser size={20} /> {post.data.author}
            </span>
            <span>
              <FiClock size={20} /> {time_to_read} min
            </span>
          </div>
        </div>
        {post.data.content.map(paragraph => (
          <div key={`${paragraph.heading}-${paragraph.body}`}>
            <div
              className={styles.containerHeading}
              dangerouslySetInnerHTML={{
                __html: paragraph.heading,
              }}
            />
            <div
              className={styles.containerBody}
              dangerouslySetInnerHTML={{
                __html: paragraph.body.toString(),
              }}
            />
          </div>
        ))}
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      orderings: '[document.first_publication_date desc]',
      pageSize: 1,
    }
  );

  const slugs = posts.results.map(post => ({
    params: {
      slug: post.uid,
    },
  }));

  // console.log(JSON.stringify(posts, null, 2));

  return {
    paths: slugs,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params;

  const prismic = getPrismicClient();

  const response = await prismic.getByUID('posts', String(slug), {});

  // console.log(response);
  const post = {
    data: {
      title: response.data.title,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content.map(item => {
        return {
          heading: item.heading,
          body: RichText.asHtml(item.body),
        };
      }),
    },
    first_publication_date: format(
      new Date(response.first_publication_date),
      'dd MMMM yyyy',
      {
        locale: ptBR,
      }
    ),
  };

  const count_worlds = response.data.content.reduce(
    (acc, item_post) => {
      let heading = [];
      let body = [];
      if (item_post.heading) {
        heading = item_post.heading.split(' ');
      }
      if (item_post.body) {
        body = RichText.asText(item_post?.body).split(' ');
      }
      acc.heading += heading.length;
      acc.body += body.length;

      return acc;
    },
    {
      heading: 0,
      body: 0,
    }
  );

  const time_to_read = Math.ceil(
    (count_worlds.heading + count_worlds.body) / 200
  );

  return {
    props: {
      post,
      time_to_read,
    },
    revalidate: 60 * 30, // 30 minutes
  };
};
