/*---------------------------------------------------------------------------------------------
|  $Copyright: (c) 2018 Bentley Systems, Incorporated. All rights reserved. $
 *--------------------------------------------------------------------------------------------*/
import { mount, shallow } from "enzyme";
import * as React from "react";

import SvgSprite from "../../src/base/SvgSprite";

describe("<SvgSprite />", () => {
  it("should render", () => {
    mount(<SvgSprite src="#test-sprite" />);
  });

  it("renders correctly", () => {
    shallow(<SvgSprite src="#test-sprite" />).should.matchSnapshot();
  });
});
