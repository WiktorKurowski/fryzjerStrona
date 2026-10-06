def dedupe(items):
    seen = set()
    result = []
    for review in items or []:
        if not isinstance(review, dict):
            continue
        key = f"id:{review.get('id')}" if review.get('id') is not None else f"review:{str(review.get('email','')).lower()}|{str(review.get('message',''))}"
        if key in seen:
            continue
        seen.add(key)
        result.append(review)
    return result


def merge(local, backend):
    local_list = dedupe(local)
    backend_list = dedupe(backend)
    merged = dedupe(backend_list + local_list)
    if merged:
        return merged
    if backend_list:
        return backend_list
    return local_list


local = [{'id': 1, 'message': 'ok'}]
backend = []
assert merge(local, backend) == local
assert merge([], [{'id': 2, 'message': 'backend'}]) == [{'id': 2, 'message': 'backend'}]
assert merge(local, [{'id': 2, 'message': 'backend'}]) == [
    {'id': 1, 'message': 'ok'},
    {'id': 2, 'message': 'backend'}
]
print('review_logic_ok')
