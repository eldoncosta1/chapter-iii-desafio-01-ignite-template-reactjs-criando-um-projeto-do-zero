import { useEffect, useState } from 'react';
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
  uid: string;
  data: {
    title: string;
    subtitle: string;
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
}

export default function Post({ post }: PostProps) {
  const { isFallback } = useRouter();

  if (isFallback) {
    return <div>Carregando...</div>;
  }

  function getTimeToWorld() {
    const count_worlds = post.data.content.reduce(
      (acc, item_post) => {
        let heading = [];
        let body = [];
        if (item_post.heading) {
          heading = item_post.heading.split(' ');
        }
        if (item_post.body) {
          const removeSpecialCharacters = RichText.asText(item_post?.body)
            .toString()
            .replace(/[^a-zA-Z0-9 ]/g, '');
          body = removeSpecialCharacters.split(' ');
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
    return `${Math.ceil((count_worlds.heading + count_worlds.body) / 200)} min`;
  }

  function getFormatedDate(date_timestamp) {
    return format(new Date(date_timestamp), 'dd MMM yyyy', { locale: ptBR });
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
              <FiCalendar size={20} />
              {getFormatedDate(post.first_publication_date)}
            </time>
            <span>
              <FiUser size={20} /> {post.data.author}
            </span>
            <span>
              <FiClock size={20} /> {getTimeToWorld()}
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
                __html: RichText.asHtml(paragraph.body),
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

  return {
    paths: slugs,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params;

  const prismic = getPrismicClient();

  const response = await prismic.getByUID('posts', String(slug), {});

  const post = {
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content.map(item => {
        return {
          heading: item.heading,
          body: item.body,
        };
      }),
    },
    first_publication_date: response.first_publication_date,
    uid: response.uid,
  };

  return {
    props: {
      post,
    },
    revalidate: 60 * 30, // 30 minutes
  };
};
