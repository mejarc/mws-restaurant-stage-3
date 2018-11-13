import DBHelper from './dbhelper';

/**
 * Create `LI` with a restaurant's review data
 * to append to review list.
 */

 const createReviewHTML = (review) => {
   const li = document.createElement('li');
   const name = document.createElement('p');
   name.innerHTML = review.name;
   li.appendChild(name);

   const date = document.createElement('p');
   date.innerHTML = new Date(review.createdAt).toLocaleDateString();
   li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
 };

 /** 
  * Clear the review form
  */
 const clearForm = () => {
  document.getElementById('name').value = '';
  document.getElementById('rating').selectedIndex = 0;
  document.getElementById('comments').value = '';
 };

 /**
  * Validate form data before POST request.
  */
 const validateAndGetData = () => {
  // Comb through the form fields,
  // ensure they have data, then add to the `data` object.
  const data = {};

  const name = document.getElementById('name');
  if (name.value === '') {
    name.focus();
    return;
  }
  const ratingSelect = document.getElementById('rating');
  const rating = ratingSelect.options[ratingSelect.selectedIndex].value;
  if (rating == '--') {
    ratingSelect.focus();
    return;
  }

  const comments = document.getElementById('comments');
  if (comments.value === '') {
    comments.focus();
    return;
  }
  const restaurantId = document.getElementById('review-form').dataset.restaurantId;

// Now that everything's checked, add it to `data`.
data.name = name.value;
data.rating = Number(rating);
data.comments = comments.value;
data.restaurant_id = Number(restaurantId);

// Dates are stored as strings in DB.
data.createdAt = new Date().toISOString();
return data;
 };