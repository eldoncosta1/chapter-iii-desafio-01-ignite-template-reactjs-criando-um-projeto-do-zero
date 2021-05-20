import { useEffect, useState } from 'react';
import { GetStaticProps } from 'next';
import Link from 'next/link';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import Prismic from '@prismicio/client';
import { FiUser, FiCalendar } from 'react-icons/fi';

import { getPrismicClient } from '../services/prismic';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';

import Header from '../components/Header';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({ postsPagination }: HomeProps) {
  const [pages, setPages] = useState<PostPagination[]>([]);
  const [nextPage, setNextPage] = useState('');

  useEffect(() => {
    if (postsPagination.results.length) {
      setPages([postsPagination]);
      setNextPage(postsPagination.next_page);
    }
  }, [postsPagination]);

  async function loadNextPage(page) {
    await fetch(page)
      .then<PostPagination>(response => response.json())
      .then(data => {
        setPages(oldPosts => [
          ...oldPosts,
          {
            next_page: data.next_page,
            results: data.results.map((post: Post) => {
              return {
                uid: post.uid,
                data: {
                  title: post.data.title,
                  subtitle: post.data.subtitle,
                  author: post.data.author,
                },
                first_publication_date: format(
                  new Date(post.first_publication_date),
                  'dd MMMM yyyy',
                  {
                    locale: ptBR,
                  }
                ),
              };
            }),
          },
        ]);
        setNextPage(data.next_page);
      });
  }

  return (
    <>
      <main className={`${commonStyles.container} ${styles.container}`}>
        <Header />
        {pages.map(posts =>
          posts.results.map(post => (
            <div className={commonStyles.posts} key={`${post.uid}`}>
              <Link href={`/post/${post.uid}`}>
                <a className={commonStyles.title}>{post.data.title}</a>
              </Link>
              <p className={commonStyles.subtitle}>{post.data.subtitle}</p>
              <div>
                <time>
                  <FiCalendar size={20} /> {post.first_publication_date}
                </time>
                <span>
                  <FiUser size={20} /> {post.data.author}
                </span>
              </div>
            </div>
          ))
        )}
        {nextPage && (
          <button type="button" onClick={() => loadNextPage(nextPage)}>
            Carregar mais posts
          </button>
        )}
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();

  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['post.title', 'product.subtitle', 'product.author'],
      pageSize: 1,
    }
  );

  // console.log(JSON.stringify(postsResponse, null, 2));

  const results = postsResponse.results.map((post: Post) => {
    return {
      uid: post.uid,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      },
      first_publication_date: format(
        new Date(post.first_publication_date),
        'dd MMMM yyyy',
        {
          locale: ptBR,
        }
      ),
    };
  });
  // console.log(JSON.stringify(postsPagination, null, 2));

  return {
    props: {
      postsPagination: {
        results,
        next_page: postsResponse.next_page,
      },
    },
  };
};
