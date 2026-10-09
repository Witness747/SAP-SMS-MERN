export const getPageAfterDeletion = (currentPage, pagination) => {
  const totalPages = pagination?.totalPages;
  if (!Number.isInteger(totalPages) || totalPages < 0) return currentPage;

  return Math.min(currentPage, Math.max(1, totalPages));
};

export const deleteAndRefreshPage = async (currentPage, deleteRequest, reloadPage) => {
  await deleteRequest();
  const response = await reloadPage(currentPage);
  return {
    response,
    nextPage: getPageAfterDeletion(currentPage, response?.meta?.pagination),
  };
};
