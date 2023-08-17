export const scroll = {
  beforeMount: (el, { value = () => {}, arg = 25 }) => {
    let lastPosition = 0;
    el.onscroll = ({ target: { offsetHeight, scrollTop, scrollHeight } }) => {
      const position = offsetHeight + scrollTop;
      const threshold = Math.round(scrollHeight * (arg / 100));
      const scrollingToTop = lastPosition > position;

      lastPosition = position;
      if (scrollingToTop) return;
      if (position >= scrollHeight - threshold) value();
    };
  }
};
