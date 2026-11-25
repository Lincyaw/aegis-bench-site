def check_new_route_requires_session(app):
    route = find_route(app, "GET", "/orders")
    assert require_session in route.dependencies
